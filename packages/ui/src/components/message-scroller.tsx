import { cn } from "@app-starter/ui/lib/utils";
import {
  MessageScroller as MessageScrollerPrimitive,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@shadcn/react/message-scroller";
import { ArrowDown, ArrowUp } from "lucide-react";
import * as React from "react";

function MessageScrollerProvider(
  props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>,
) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}

function MessageScroller({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return (
    <MessageScrollerPrimitive.Root
      data-slot="message-scroller"
      className={cn("relative flex min-h-0 flex-col overflow-hidden", className)}
      {...props}
    />
  );
}

function MessageScrollerViewport({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport>) {
  return (
    <MessageScrollerPrimitive.Viewport
      data-slot="message-scroller-viewport"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none",
        "focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

function MessageScrollerContent({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return (
    <MessageScrollerPrimitive.Content
      data-slot="message-scroller-content"
      className={cn("flex min-h-full flex-col gap-4 p-4", className)}
      {...props}
    />
  );
}

function MessageScrollerItem({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      data-slot="message-scroller-item"
      className={cn("[content-visibility:auto] [contain-intrinsic-size:0_96px]", className)}
      {...props}
    />
  );
}

function MessageScrollerButton({
  className,
  children,
  direction = "end",
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Button>) {
  return (
    <MessageScrollerPrimitive.Button
      data-slot="message-scroller-button"
      direction={direction}
      className={cn(
        "absolute bottom-4 right-4 z-10 flex size-8 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition",
        "data-[active=false]:pointer-events-none data-[active=false]:translate-y-1 data-[active=false]:opacity-0",
        "hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    >
      {children ??
        (direction === "start" ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        ))}
    </MessageScrollerPrimitive.Button>
  );
}

export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
