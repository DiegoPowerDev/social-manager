"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  platform?: string;
  accountName?: string;
  message?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}

export function PostPreview({
  platform,
  accountName,
  message,
  imageUrl,
  videoUrl,
}: Props) {
  return (
    <Card className="h-fit sticky top-6 bg-white text-foreground">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="">Vista previa</CardTitle>
          {platform && (
            <Badge variant="secondary" className="capitalize">
              {platform}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg overflow-hidden">
          {/* Header del post */}
          {accountName && (
            <div className="flex items-center gap-2 p-3">
              <div className="w-8 h-8 rounded-full bg-muted text-black flex items-center justify-center text-xs font-medium">
                {accountName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium leading-none">
                  {platform === "instagram" ? `@${accountName}` : accountName}
                </p>
                <p className="text-xs text-muted-foreground">Ahora</p>
              </div>
            </div>
          )}

          {/* Media */}
          {(imageUrl || videoUrl) && (
            <div className="bg-muted">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-cover"
                />
              )}
              {videoUrl && !imageUrl && (
                <video src={videoUrl} controls className="w-full max-h-64" />
              )}
            </div>
          )}

          {/* Texto */}
          <div className="p-3">
            {message ? (
              <p className="text-sm whitespace-pre-wrap line-clamp-6">
                {message}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                El texto del post aparecerá aquí...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
