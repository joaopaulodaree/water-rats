"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  await new Promise<void>((res, rej) => {
    image.onload = () => res();
    image.onerror = rej;
    image.src = imageSrc;
  });

  const SIZE = 400;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    SIZE,
    SIZE
  );

  return new Promise<Blob>((res, rej) =>
    // PNG lossless — browser-image-compression converte para JPEG como encode final
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("canvas.toBlob retornou null"))),
      "image/png"
    )
  );
}

interface AvatarCropModalProps {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function AvatarCropModal({ src, onConfirm, onCancel }: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(src, croppedAreaPixels);
    onConfirm(blob);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* crop area — touch-action none é obrigatório para iOS Safari */}
      <div className="relative flex-1" style={{ touchAction: "none" }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* zoom slider */}
      <div className="flex items-center gap-3 px-6 py-3 bg-black">
        <span className="text-white/50 text-xs">−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-[#0891b2]"
        />
        <span className="text-white/50 text-xs">+</span>
      </div>

      {/* botões */}
      <div className="flex gap-3 px-6 pb-8 pt-2 bg-black">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-white/20 text-white text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 rounded-2xl bg-[#0891b2] text-white text-sm font-semibold"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
