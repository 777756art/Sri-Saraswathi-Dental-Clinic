import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F5] p-6 text-center">
          <div className="w-full max-w-md rounded-3xl border border-[#e4ded6] bg-white p-8 shadow-lift">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fbebf2] text-[#ed2f79]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mt-5 font-display text-2xl font-semibold text-[#173e45]">Something unexpected happened</h2>
            <p className="mt-2 text-sm text-[#5a7276]">
              {this.state.error?.message || "Please refresh the page to continue."}
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 rounded-xl bg-[#173e45] px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#1f4f58]"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="flex-1 rounded-xl border border-[#d8d0c7] bg-white px-5 py-3 text-sm font-semibold text-[#173e45] transition hover:bg-[#f8f6f2]"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
