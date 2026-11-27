// Install metadata for the hosted app. Learner pages use online sessions.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iLearn",
    short_name: "iLearn",
    description: "Structured, self-paced learning.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f6fa",
    theme_color: "#2454bb",
  };
}
