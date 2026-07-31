import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      const componentName = this.props.fallbackName || "Application Component";
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-card border border-destructive/30 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <div className="size-12 rounded-xl bg-destructive/10 grid place-items-center flex-shrink-0">
                <ShieldAlert className="size-6 text-destructive" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Crashed inside: <span className="text-destructive font-semibold">{componentName}</span>
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="rounded-xl bg-muted/60 border border-border p-4 font-mono text-xs space-y-2">
                <div className="text-destructive font-bold">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="max-h-48 overflow-auto text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {this.state.errorInfo.componentStack.trim()}
                  </pre>
                )}
                {this.state.error.stack && (
                  <details className="mt-2 text-[10px] text-muted-foreground cursor-pointer">
                    <summary className="font-sans text-xs hover:text-foreground">Full Stack Trace</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{this.state.error.stack}</pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={this.handleReset} variant="default" className="bg-primary text-primary-foreground font-bold gap-2">
                <RefreshCw className="size-4" /> Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline" className="gap-2">
                <Home className="size-4" /> Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
