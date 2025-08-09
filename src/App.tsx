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
  const { audio: testSound } = useGetAudio({ path: "/test-sound.mp3" });

  const { getFrequencyResponse } = useEq({ audio: testSound });
  const [frequneyResponse, setFrequenctresponse] = useState<{
    frequencyArray: number[];
    totalMagResponse: number[];
  }>();

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
      <Line
        options={options}
        data={{
          labels: frequneyResponse?.frequencyArray,
          datasets: [
            {
              label: "Dataset 1",
              data: frequneyResponse?.totalMagResponse,
              borderColor: "rgb(255, 99, 132)",
              backgroundColor: "rgba(255, 99, 132, 0.5)",
            },
          ],
        }}
      />
    </>
  );
}

export default App;
