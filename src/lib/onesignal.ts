// OneSignal Web SDK (v16) — client-side helpers
export const ONESIGNAL_APP_ID = "d3c273de-eca7-4b06-84db-4a3d41272b6b";

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

let initialized = false;

export function loadOneSignal(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));

  // Inject SDK script once
  if (!document.querySelector('script[data-onesignal-sdk]')) {
    const s = document.createElement("script");
    s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.defer = true;
    s.setAttribute("data-onesignal-sdk", "true");
    document.head.appendChild(s);
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      if (!initialized) {
        initialized = true;
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "OneSignalSDKWorker.js",
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
          });
        } catch (e) {
          console.error("[OneSignal] init failed:", e);
        }
      }
      resolve(OneSignal);
    });
  });
}

export async function getOneSignal(): Promise<any> {
  return loadOneSignal();
}

export async function loginOneSignal(userId: string) {
  try {
    const OneSignal = await getOneSignal();
    await OneSignal.login(userId);
  } catch (e) {
    console.warn("[OneSignal] login failed:", e);
  }
}

export async function logoutOneSignal() {
  try {
    const OneSignal = await getOneSignal();
    await OneSignal.logout();
  } catch (e) {
    console.warn("[OneSignal] logout failed:", e);
  }
}
