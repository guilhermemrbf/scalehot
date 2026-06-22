importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Avisa todas as abas/clientes abertos para tocar o som de "dinheiro caindo"
// quando uma push chegar. Em background sem clientes visíveis, o SO toca o
// som padrão do sistema (web push não suporta som customizado nativo).
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const clientsList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clientsList) {
          client.postMessage({ type: "scaleup:play-sale-sound" });
        }
      } catch (e) {
        // silencioso
      }
    })()
  );
});
