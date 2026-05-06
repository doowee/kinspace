import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("App error boundary caught:", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="text-center max-w-md space-y-6">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              Something went wrong
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              We hit an unexpected error.
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              The error has been logged. Try reloading — if it keeps happening, drop us a note.
            </p>
            <div className="flex justify-center pt-2">
              <Button onClick={this.handleReload}>Reload page</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
