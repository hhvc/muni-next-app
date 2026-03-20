"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
  fallbackPath?: string; // por si no hay historial
  className?: string;
};

export default function BackButton({
  label = "Volver",
  fallbackPath = "/",
  className = "btn btn-outline-secondary",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackPath);
    }
  };

  return (
    <button className={className} onClick={handleClick}>
      <i className="bi bi-arrow-left me-2"></i>
      {label}
    </button>
  );
}
