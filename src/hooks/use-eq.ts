import { useRef, useEffect, useState } from "react";

export function useEq() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<Array<BiquadFilterNode | null>>([]);

  const [gainValues, setGainValues] = useState({});
  const [qValues, setQValues] = useState({});

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      // 오디오 컨텍스트가 없으면 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new window.AudioContext();

        // 오디오 소스(예: mp3 파일)를 로드
        const audio = new Audio("/test-sound.mp3");
        // audio.crossOrigin = "anonymous"; // CORS 문제 해결
        sourceRef.current =
          audioContextRef.current.createMediaElementSource(audio);

        // EQ를 위한 필터 노드들을 생성
        const frequencies = [60, 170, 350, 1000, 3500, 10000]; // 예시 주파수
        filtersRef.current = frequencies.map((freq, index) => {
          const filter = audioContextRef.current?.createBiquadFilter();

          if (filter == null) {
            return null;
          }

          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.gain.value = index * 5; // 초기 게인값은 0dB
          filter.Q.value = 1; // 초기 Q값은 1
          return filter;
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

        const frequencyBinCount = 512;
        const sampleRate = audioContextRef.current.sampleRate;

        const frequencyArray = new Float32Array(frequencyBinCount);
        const magResponse = new Float32Array(frequencyBinCount);
        const phaseResponse = new Float32Array(frequencyBinCount);

        const minLogFrequency = Math.log10(20);
        const maxLogFrequency = Math.log10(20000);
        const logFrequencyStep =
          (maxLogFrequency - minLogFrequency) / (frequencyBinCount - 1);

        for (let i = 0; i < frequencyBinCount; i++) {
          const logFrequency = minLogFrequency + i * logFrequencyStep;
          frequencyArray[i] = Math.pow(10, logFrequency);
        }

        // 3. getFrequencyResponse 호출
        // 모든 필터의 응답을 합산
        // (이 부분은 여러 필터가 있을 경우의 로직입니다)
        const totalMagResponse = new Float32Array(frequencyBinCount).fill(0);

        filtersRef.current.forEach((filter) => {
          const currentMagResponse = new Float32Array(frequencyBinCount);
          filter?.getFrequencyResponse(
            frequencyArray,
            currentMagResponse,
            phaseResponse
          );

          // magResponse 값은 선형 스케일이므로 dB로 변환 후 합산
          for (let i = 0; i < frequencyBinCount; i++) {
            totalMagResponse[i] += 20 * Math.log10(currentMagResponse[i]);
          }
        });

        console.log(totalMagResponse);

        // 오디오 재생
        audio.play();
      }
    });

    return () => {
      // 컴포넌트 언마운트 시 오디오 컨텍스트 닫기
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
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
