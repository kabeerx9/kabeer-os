import { type Href } from "expo-router";

type NavigationRouter = {
  push: (href: Href) => void;
};

export function pushDecoratedUrl(
  router: NavigationRouter,
  decorateUrl: (url: string) => string,
  href: string,
) {
  const url = decorateUrl(href);
  const nextHref = url.startsWith("http") ? new URL(url).pathname : url;
  router.push(nextHref as Href);
}
