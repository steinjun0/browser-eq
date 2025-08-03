import { useEffect, useState } from "react";
import { getDefferedPromise } from "../utils/get-deffered-promise";

export function useGetAudio({ path }: { path: string }) {
  const promiseAudio = getDefferedPromise<HTMLAudioElement>();
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        const _audio = new Audio(path);
        setAudio(_audio);
        promiseAudio.resolve(_audio);
      })
      .catch((e) => {
        promiseAudio.reject(e);
      });
  }, []);

  return { audio, promiseAudio };
}
