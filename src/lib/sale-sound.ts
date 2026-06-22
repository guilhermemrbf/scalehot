import notifAsset from "@/assets/notification.mp3.asset.json";

let audioEl: HTMLAudioElement | null = null;
let listenerInstalled = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio(notifAsset.url);
    audioEl.preload = "auto";
    audioEl.volume = 0.9;
  }
  return audioEl;
}

export function playSaleSound() {
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof (p as any).catch === "function") {
      (p as Promise<void>).catch(() => {
        // autoplay bloqueado — ignora
      });
    }
  } catch {
    // ignora
  }
}

export function installSaleSoundListener() {
  if (typeof window === "undefined") return;
  if (listenerInstalled) return;
  if (!("serviceWorker" in navigator)) return;
  listenerInstalled = true;
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "scaleup:play-sale-sound") {
      playSaleSound();
    }
  });
}
