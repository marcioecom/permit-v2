import { useEffect, useState } from "react";
import { ApiError, createApiClient } from "../lib/api-client";
import type { WidgetConfig } from "../context/PermitContext";

interface UseWidgetConfigOptions {
  apiUrl: string;
  projectId: string;
}

export function useWidgetConfig({ apiUrl, projectId }: UseWidgetConfigOptions) {
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const api = createApiClient(apiUrl);
        const data = await api.get<unknown, any>(
          `/projects/${projectId}/widget`,
        );
        setWidgetConfig({
          title: data.title,
          subtitle: data.subtitle,
          enabledProviders: data.enabledProviders,
          primaryColor: data.themeConfig?.primaryColor,
          logoUrl: data.themeConfig?.logoUrl,
          showSecuredBadge: data.themeConfig?.showSecuredBadge ?? true,
          termsUrl: data.themeConfig?.termsUrl,
          privacyUrl: data.themeConfig?.privacyUrl,
          defaultEnvironmentId: data.defaultEnvironmentId,
        });
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.status === 404) {
          setConfigError("Invalid project ID");
        } else {
          setConfigError(
            apiError.message || "Failed to load project configuration",
          );
        }
      }
    };
    fetchConfig();
  }, [apiUrl, projectId]);

  return { widgetConfig, configError };
}
