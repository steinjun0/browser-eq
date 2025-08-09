import { useCallback, useEffect, useRef } from "react";

const NUMBER_OF_FREQUENCY_POINTS = 1024;
const FrequencyRange = {
  MIN: 20,
  MAX: 20000,
};

export function useEq({ audio }: { audio: HTMLAudioElement | null }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<Array<BiquadFilterNode | null>>([]);

  useEffect(() => {
    if (audio == null) {
      return;
    }

    audioContextRef.current = new window.AudioContext();
    // audio.crossOrigin = "anonymous"; // CORS 문제 해결 // 없어도 문제 없음?
    sourceRef.current = audioContextRef.current.createMediaElementSource(audio);

    // EQ를 위한 필터 노드들을 생성
    filtersRef.current = initializeFilters({
      frequencies: [60, 1000, 3500, 10000],
      audioContext: audioContextRef.current,
    });

    const firstFilter = filtersRef.current[0];
    const lastFilter = filtersRef.current[filtersRef.current.length - 1];
    if (firstFilter == null || lastFilter == null) {
      return;
    }

    // 노드들을 연결: source -> filter1 -> filter2 -> ... -> destination
    sourceRef.current.connect(firstFilter);
    connectFilters(filtersRef.current);
    lastFilter.connect(audioContextRef.current.destination);

    // 오디오 재생
    audio.play();

    return () => {
      // 컴포넌트 언마운트 시 오디오 컨텍스트 닫기
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audio]);

  const getFrequencyResponse = useCallback(() => {
    if (audioContextRef.current == null) {
      throw new Error("audioContext is Not ready");
    }
    return getFrequencyResponseCore({
      filters: filtersRef.current,
    });
  }, []);

  const updateFilter = useCallback(
    ({
      index,
      frequency,
      gain,
      Q,
    }: {
      index: number;
      frequency?: number;
      gain?: number;
      Q?: number;
    }) => {
      const filter = filtersRef.current[index];
      if (filter == null) return;
      if (frequency != null) {
        filter.frequency.value = clamp(
          frequency,
          FrequencyRange.MIN,
          FrequencyRange.MAX
        );
      }
      if (gain != null) {
        filter.gain.value = gain; // dB 값 그대로 반영
      }
      if (Q != null) {
        filter.Q.value = Math.max(0.0001, Q);
      }
    },
    []
  );

  return {
    getFrequencyResponse,
    updateFilter,
  };
}

function initializeFilters({
  frequencies,
  audioContext,
}: {
  frequencies: number[];
  audioContext: AudioContext;
}) {
  const filters = frequencies.map((freq) => {
    const filter = audioContext.createBiquadFilter();

    filter.type = "peaking";
    filter.frequency.value = freq;
    filter.gain.value = 0; // 초기 게인값 0dB
    filter.Q.value = 10; // 초기 Q값
    return filter;
  });

  return filters;
}

function connectFilters(filters: Array<BiquadFilterNode | null>) {
  filters.forEach((filter, index) => {
    const nextFilter = filters[index + 1];
    if (filter == null || nextFilter == null) {
      return;
    }
    filter.connect(nextFilter);
  });
}

function getFrequencyResponseCore({
  filters,
}: {
  filters: Array<BiquadFilterNode | null>;
}) {
  const frequencyArray = getFrequencyArray();
  const phaseResponse = new Float32Array(NUMBER_OF_FREQUENCY_POINTS);
  const totalMagResponse = new Float32Array(NUMBER_OF_FREQUENCY_POINTS).fill(0);

  filters.forEach((filter) => {
    const currentMagResponse = new Float32Array(NUMBER_OF_FREQUENCY_POINTS);
    filter?.getFrequencyResponse(
      frequencyArray,
      currentMagResponse,
      phaseResponse
    );

    // magResponse 값은 선형 스케일이므로 dB로 변환 후 합산
    for (let i = 0; i < NUMBER_OF_FREQUENCY_POINTS; i++) {
      totalMagResponse[i] += 20 * Math.log10(currentMagResponse[i]);
    }
  });

  return {
    frequencyArray,
    totalMagResponse,
  };
}

/** @description Get frequency list for X Axis */
function getFrequencyArray({
  numberOfFrequencyPoints = NUMBER_OF_FREQUENCY_POINTS,
  frequencyRange = {
    min: FrequencyRange.MIN,
    max: FrequencyRange.MAX,
  },
}: {
  numberOfFrequencyPoints?: number;
  frequencyRange?: {
    min: number;
    max: number;
  };
} = {}) {
  const frequencyArray = new Float32Array(numberOfFrequencyPoints);
  const minLogFrequency = Math.log10(frequencyRange.min);
  const maxLogFrequency = Math.log10(frequencyRange.max);
  const logFrequencyStep =
    (maxLogFrequency - minLogFrequency) / (numberOfFrequencyPoints - 1);

  for (let i = 0; i < numberOfFrequencyPoints; i++) {
    const logFrequency = minLogFrequency + i * logFrequencyStep;
    frequencyArray[i] = Math.pow(10, logFrequency);
  }

  return frequencyArray;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
