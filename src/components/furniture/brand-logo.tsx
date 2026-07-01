import { component$ } from "@builder.io/qwik";

interface BrandLogoProps {
  class?: string;
  size?: number;
}

export default component$<BrandLogoProps>((props) => {
  const size = props.size ?? 28;

  return (
    <svg
      class={props.class}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Lockstep logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#14b8a6"
        d="M16 2.5 27 6.8v7.1c0 7.2-4.4 12.9-11 15.6C9.4 26.8 5 21.1 5 13.9V6.8l11-4.3Z"
      />
      <path
        fill="#0f172a"
        opacity=".2"
        d="M16 2.5v27c6.6-2.7 11-8.4 11-15.6V6.8L16 2.5Z"
      />
      <path
        fill="none"
        stroke="#ffffff"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="3"
        d="m10.1 15.8 3.6 3.6 8-8.8"
      />
      <path
        fill="none"
        stroke="#ccfbf1"
        stroke-linecap="round"
        stroke-width="2"
        d="M10 23h12"
      />
    </svg>
  );
});
