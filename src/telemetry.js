(() => {
  "use strict";

  const sdk = window.Microsoft && window.Microsoft.ApplicationInsights;
  if (!sdk) return;

  const appInsights = new sdk.ApplicationInsights({
    config: {
      connectionString: "InstrumentationKey=f545facc-7640-4796-9d47-2c0349e04cce;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus2.livediagnostics.monitor.azure.com/;ApplicationId=1c5a5b4a-fc50-42e3-a257-14dda4562049",
      disableCookiesUsage: true,
      enableAutoRouteTracking: false,
      enableCorsCorrelation: false,
      samplingPercentage: 100
    }
  });

  appInsights.loadAppInsights();
  appInsights.addTelemetryInitializer((item) => {
    const baseData = item.baseData || (item.baseData = {});
    const properties = baseData.properties || (baseData.properties = {});
    properties.site = "guest";
    properties.dataClassification = "public-demo";
  });
  appInsights.trackPageView({ name: document.title });
})();
