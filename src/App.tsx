import dragDataPlugin from "chartjs-plugin-dragdata";
import { useState } from "react";
import "./App.css";
import { useEq } from "./hooks/use-eq";
import { useGetAudio } from "./hooks/use-get-audio";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  LogarithmicScale,
  PointElement,
  Title,
  Tooltip,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  dragDataPlugin
);

const X_MIN = 20;
const X_MAX = 20000;
const Y_MIN = -12;
const Y_MAX = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function App() {
  const { audio: testSound } = useGetAudio({ path: "/test-sound.mp3" });
  const { getFrequencyResponse, updateFilter, resumeAudioContext } = useEq({
    audio: testSound,
  });

  // 4개의 EQ 포인트 (x: Hz, y: dB)
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([
    { x: 60, y: 0 },
    { x: 1000, y: 0 },
    { x: 3500, y: 0 },
    { x: 10000, y: 0 },
  ]);

  // 주파수 응답선 데이터 (비인터랙티브)
  const [responsePoints, setResponsePoints] = useState<
    Array<{ x: number; y: number }>
  >([]);

  const options: ChartOptions<"line"> = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { display: true },
      title: {
        display: true,
        text: "Draggable 4-point EQ",
      },
      /**
       * @note
       * dragDataPlugin doesn't have Typescript. Check Repo.
       * https://github.com/artus9033/chartjs-plugin-dragdata?tab=readme-ov-file#per-chart-configuration
       */
      dragData: {
        dragX: true,
        dragY: true,
        showTooltip: true,
        round: 0, // 정수 필요 없으면 0
        onDrag: (
          _e: unknown,
          _datasetIndex: number,
          index: number,
          value: any
        ) => {
          // 드래그 중 경계값 클램프
          const nx = clamp(value.x, X_MIN, X_MAX);
          const ny = clamp(value.y, Y_MIN, Y_MAX);
          value.x = nx;
          value.y = ny;
          updateFilter({ index, frequency: nx, gain: ny });
          setPoints((prev) => {
            const next = [...prev];
            next[index] = { x: nx, y: ny };
            // X축 정렬을 원하면 아래 주석 해제
            // next.sort((a, b) => a.x - b.x);
            return next;
          });

          const res = getFrequencyResponse();
          const fp: Array<{ x: number; y: number }> = Array.from(
            res.frequencyArray
          ).map((f, i) => ({ x: f, y: res.totalMagResponse[i] }));
          setResponsePoints(fp);
        },
        // onDragEnd: (
        //   _e: unknown,
        //   _datasetIndex: number,
        //   index: number,
        //   value: any
        // ) => {},
      },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        type: "logarithmic",
        min: X_MIN,
        max: X_MAX,
        ticks: {
          callback: (v: any) => {
            const val = Number(v);
            if (
              [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].includes(
                val
              )
            ) {
              return val >= 1000 ? `${val / 1000}k` : `${val}`;
            }
            return "";
          },
        },
        title: { display: true, text: "Frequency (Hz)" },
        grid: { color: "rgba(0,0,0,0.1)" },
      },
      y: {
        type: "linear",
        min: Y_MIN,
        max: Y_MAX,
        ticks: { stepSize: 3 },
        title: { display: true, text: "Gain (dB)" },
        grid: { color: "rgba(0,0,0,0.1)" },
      },
    },
    elements: {
      line: { tension: 0.3 },
      point: { radius: 5, hitRadius: 12, hoverRadius: 7 },
    },
    // 포인트에 정확히 포인터가 겹쳐야 하도록 설정 (라인에 가깝기만 한 경우 선택되지 않음)
    interaction: { mode: "nearest", axis: "xy", intersect: true },
  } as any;

  const data: ChartData<"line"> = {
    datasets: [
      {
        label: "Frequency Response",
        data: responsePoints,
        borderColor: "rgb(0, 200, 140)",
        backgroundColor: "rgba(0, 200, 140, 0.15)",
        fill: false,
        pointRadius: 0,
        pointHitRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        order: 0,
        // 이 데이터셋은 드래그 비활성화
        dragData: false as any,
      },
      {
        label: "EQ Points",
        data: points,
        borderColor: "rgb(99, 132, 255)",
        backgroundColor: "rgba(99, 132, 255, 0.4)",
        fill: false,
        order: 1, // 항상 상단에 그려져 드래그 우선
      },
    ],
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={async () => {
            try {
              await resumeAudioContext();
            } catch {}
            if (testSound) {
              try {
                await testSound.play();
              } catch {}
            }
          }}
          disabled={!testSound}
        >
          Play
        </button>
        <button
          onClick={() => {
            if (testSound) {
              try {
                testSound.pause();
              } catch {}
            }
          }}
          disabled={!testSound}
        >
          Pause
        </button>
        <button
          onClick={() => {
            if (testSound) {
              try {
                testSound.pause();
                testSound.currentTime = 0;
              } catch {}
            }
          }}
          disabled={!testSound}
        >
          Stop
        </button>

        <button
          onClick={() => {
            const res = getFrequencyResponse();
            const fp: Array<{ x: number; y: number }> = Array.from(
              res.frequencyArray
            ).map((f, i) => ({ x: f, y: res.totalMagResponse[i] }));
            setResponsePoints(fp);
          }}
        >
          getData
        </button>
      </div>

      <Line options={options} data={data} />
    </>
  );
}

export default App;
