import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function BookQrCode({
  bookId,
  size = 160,
  className,
}: {
  bookId: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(bookId, {
      width: size * 2,
      margin: 1,
      color: { dark: "#3A3550", light: "#FFFFFF" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      active = false;
    };
  }, [bookId, size]);

  if (!src) {
    return <div className={className} style={{ width: size, height: size }} aria-hidden />;
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`QR code for book ${bookId}`}
      className={className}
    />
  );
}

export function downloadQr(bookId: string, title: string) {
  QRCode.toDataURL(bookId, { width: 800, margin: 2 }).then((url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${bookId}.png`;
    a.click();
  });
}
