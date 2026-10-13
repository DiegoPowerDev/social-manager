import React from "react";

interface Props {
  title: string;
  description: string;
}

export default function TitleComponent({ title, description }: Props) {
  return (
    <div className="p-6 bg-zinc-950/50 backdrop-blur">
      <h2 className="text-3xl font-bold text-black">{title}</h2>
      <p className=" mt-1">{description}</p>
    </div>
  );
}
