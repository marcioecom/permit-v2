import { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PermitProvider } from "@/PermitProvider";

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: ReactNode;
}

// Basic wrapper with QueryClient only
const QueryWrapper = ({ children }: WrapperProps) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Full wrapper with PermitProvider
interface PermitWrapperOptions {
  projectId?: string;
  apiUrl?: string;
}

const createPermitWrapper = (options: PermitWrapperOptions = {}) => {
  const { projectId = "test_project", apiUrl = "http://localhost:8080/api/v1" } =
    options;

  return ({ children }: WrapperProps) => (
    <PermitProvider projectId={projectId} config={{ apiUrl }}>
      {children}
    </PermitProvider>
  );
};

// Custom render with QueryClient
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: QueryWrapper, ...options });

// Render with PermitProvider
const renderWithPermit = (
  ui: ReactElement,
  permitOptions?: PermitWrapperOptions,
  renderOptions?: Omit<RenderOptions, "wrapper">
) =>
  render(ui, {
    wrapper: createPermitWrapper(permitOptions),
    ...renderOptions,
  });

// Re-export everything from testing-library
export * from "@testing-library/react";
export { userEvent } from "@testing-library/user-event";

// Override render
export { customRender as render, renderWithPermit };
