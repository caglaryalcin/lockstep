import { useDocumentHead, useLocation } from "@builder.io/qwik-city";

import { component$ } from "@builder.io/qwik";
import { brand } from "~/brand";

const withoutDangerousHtml = (props?: object) => {
  const cleanProps = { ...(props ?? {}) };
  delete (cleanProps as { dangerouslySetInnerHTML?: unknown }).dangerouslySetInnerHTML;
  return cleanProps;
};

export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();
  const meta = head.meta;
  const links = head.links;
  const styles = head.styles;
  const scripts = head.scripts;

  return (
    <>
      {/* Basics */}
      <title>{head.title || brand.title}</title>
      <meta name="description" content={brand.tagline} />
      
      {/* Site config */}
      <link rel="canonical" href={loc.url.href} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="icon" type="image/svg+xml" href="/lockstep-logo.svg" />
      <link rel="apple-touch-icon" href="/favicon.png" />
      <meta name="theme-color" content={brand.themeColor} />
      <link rel="manifest" href="/manifest.json" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={loc.url.href} />
      <meta property="og:title" content={brand.title} />
      <meta property="og:description" content={brand.tagline} />
      <meta property="og:image" content="/banner.png" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={loc.url.href} />
      <meta name="twitter:title" content={brand.title} />
      <meta name="twitter:description" content={brand.tagline} />
      <meta name="twitter:image" content="/banner.png" />

      {meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}

      {links.map((l) => (
        <link key={l.key} {...l} />
      ))}

      {styles.map((s) => (
        <style key={s.key} {...withoutDangerousHtml(s.props)} dangerouslySetInnerHTML={s.style} />
      ))}

      {scripts.map((s) => (
        <script key={s.key} {...withoutDangerousHtml(s.props)} dangerouslySetInnerHTML={s.script} />
      ))}
    </>
  );
});
