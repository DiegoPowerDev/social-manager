"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Video, Link as LinkIcon, X } from "lucide-react";

interface Props {
  pageName: string;
  onPublish: (data: {
    message: string;
    link?: string;
    image?: File | null;
    video?: File | null;
  }) => Promise<void>;
  loading?: boolean;
}

export function FacebookComposer({
  pageName,
  onPublish,
  loading = false,
}: Props) {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limpiar video si había
    setVideo(null);
    setVideoPreview(null);

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limpiar imagen si había
    setImage(null);
    setImagePreview(null);

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setImage(null);
    setVideo(null);
    setImagePreview(null);
    setVideoPreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!message.trim() && !image && !video) return;

    await onPublish({
      message,
      link: link.trim() || undefined,
      image,
      video,
    });

    // Limpiar después de publicar
    setMessage("");
    setLink("");
    removeMedia();
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > 63206; // límite aproximado de Facebook

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Nueva publicación</CardTitle>
            <CardDescription>Publicando en {pageName}</CardDescription>
          </div>
          <Badge variant="secondary">Facebook</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Texto */}
        <div className="space-y-2">
          <Textarea
            placeholder="¿Qué quieres publicar?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${
                isOverLimit ? "text-red-500" : "text-muted-foreground"
              }`}
            >
              {characterCount.toLocaleString()} caracteres
            </span>
          </div>
        </div>

        {/* Preview de media */}
        {(imagePreview || videoPreview) && (
          <div className="relative rounded-lg overflow-hidden border bg-muted/30">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-80 object-contain"
              />
            )}
            {videoPreview && (
              <video src={videoPreview} controls className="w-full max-h-80" />
            )}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full"
              onClick={removeMedia}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Enlace opcional */}
        <div className="space-y-2">
          <Label htmlFor="link" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Enlace (opcional)
          </Label>
          <Input
            id="link"
            placeholder="https://ejemplo.com"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        {/* Acciones de media + Publicar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              onChange={handleVideoChange}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              disabled={!!video}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Imagen
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={!!image}
            >
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={
              loading || isOverLimit || (!message.trim() && !image && !video)
            }
          >
            {loading ? "Publicando..." : "Publicar ahora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
