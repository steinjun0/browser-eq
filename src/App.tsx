import { useState } from "react";
import "./App.css";
import reactLogo from "./assets/react.svg";
import { useEq } from "./hooks/use-eq";
import { useGetAudio } from "./hooks/use-get-audio";
import viteLogo from "/vite.svg";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);
const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: "Chart.js Line Chart",
    },
  },
};

function App() {
  const [count, setCount] = useState(0);

  const { audio: testSound } = useGetAudio({ path: "/test-sound.mp3" });

  const { getFrequencyResponse } = useEq({ audio: testSound });
  const [frequneyResponse, setFrequenctresponse] = useState<{
    frequencyArray: number[];
    totalMagResponse: number[];
  }>();

  try {
    console.log("getFrequencyResponse", getFrequencyResponse());
  } catch {}

  return (
    <>
      <button
        onClick={() => {
          const res = getFrequencyResponse();
          setFrequenctresponse({
            frequencyArray: [...res.frequencyArray],
            totalMagResponse: [...res.totalMagResponse],
          });
        }}
      >
        getData
      </button>
      {frequneyResponse ? (
        <Line
          options={options}
          data={{
            labels: frequneyResponse.frequencyArray,
            datasets: [
              {
                label: "Dataset 1",
                data: frequneyResponse.totalMagResponse,
                borderColor: "rgb(255, 99, 132)",
                backgroundColor: "rgba(255, 99, 132, 0.5)",
              },
            ],
          }}
        />
      ) : null}
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
