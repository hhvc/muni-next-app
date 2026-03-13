// src\components\lookers\DashboardThumbnail.tsx
"use client";

import Image from "next/image";
import { convertGoogleDriveUrl } from "@/utils/googleDrive";

type Props = {
  title: string;
  thumbnailUrl?: string | null;
  size?: number;
  fillContainer?: boolean;
};

export default function DashboardThumbnail({
  title,
  thumbnailUrl,
  size = 40,
  fillContainer = false,
}: Props) {
  const src = thumbnailUrl ? convertGoogleDriveUrl(thumbnailUrl) : null;

  if (fillContainer) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={title}
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className="w-100 h-100 bg-secondary d-flex align-items-center justify-content-center">
            <i className="bi bi-bar-chart-line text-white fs-2"></i>
          </div>
        )}
      </div>
    );
  }

  /* modo avatar / icono */

  return (
    <div
      className="rounded"
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes={`${size}px`}
          className="rounded"
          style={{ objectFit: "cover" }}
          unoptimized
        />
      ) : (
        <div className="w-100 h-100 bg-secondary d-flex align-items-center justify-content-center rounded">
          <i className="bi bi-bar-chart-line text-white"></i>
        </div>
      )}
    </div>
  );
}
