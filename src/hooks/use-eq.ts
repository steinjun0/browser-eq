import { useCallback, useEffect, useRef, useState } from "react";

const NUMBER_OF_FREQUENCY_POINTS = 1024;

export function useEq({ audio }: { audio: HTMLAudioElement | null }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<Array<BiquadFilterNode | null>>([]);

  const [gainValues, setGainValues] = useState({});
  const [qValues, setQValues] = useState({});

  useEffect(() => {
    if (audio == null) {
      return;
    }

    audioContextRef.current = new window.AudioContext();
    // audio.crossOrigin = "anonymous"; // CORS 문제 해결 // 없어도 문제 없음?
    sourceRef.current = audioContextRef.current.createMediaElementSource(audio);

    // EQ를 위한 필터 노드들을 생성
    filtersRef.current = initializeFilters({
      //   frequencies: [60, 170, 350, 1000, 3500, 10000], // 예시 주파수
      frequencies: [60, 1000, 3500, 10000], // 예시 주파수
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

    console.log(sourceRef.current);

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
      audioContext: audioContextRef.current,
      filters: filtersRef.current,
    });
  }, []);

  return {
    getFrequencyResponse,
  };
}

function initializeFilters({
  frequencies,
  audioContext,
}: {
  frequencies: number[];
  audioContext: AudioContext;
}) {
  const filters = frequencies.map((freq, index) => {
    const filter = audioContext.createBiquadFilter();

    filter.type = "peaking";
    filter.frequency.value = freq;
    filter.gain.value = 1; // 초기 게인값은 1dB
    filter.Q.value = 10; // 초기 Q값은 1
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
  audioContext,
  filters,
}: {
  audioContext: AudioContext;
  filters: Array<BiquadFilterNode | null>;
}) {
  const sampleRate = audioContext.sampleRate;

  // const frequencyArray = new Float32Array(numberOfFrequencyPoints);
  const frequencyArray = getFrequencyArray();
  const magResponse = new Float32Array(NUMBER_OF_FREQUENCY_POINTS);
  const phaseResponse = new Float32Array(NUMBER_OF_FREQUENCY_POINTS);

  console.log("frequencyArray", frequencyArray);

  // 3. getFrequencyResponse 호출
  // 모든 필터의 응답을 합산
  // (이 부분은 여러 필터가 있을 경우의 로직입니다)
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

  console.log(totalMagResponse);

  return {
    frequencyArray,
    totalMagResponse,
  };
}

/** @description Get frequency list for X Axis*/
function getFrequencyArray({
  numberOfFrequencyPoints = NUMBER_OF_FREQUENCY_POINTS,
  frequencyRange = {
    min: 20,
    max: 20000,
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
