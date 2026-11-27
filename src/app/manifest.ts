// Install metadata for the hosted app. Learner pages use online sessions.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iLearn",
    short_name: "iLearn",
    description: "Structured, self-paced learning.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f2f5f3",
    theme_color: "#075b45",
  };
}
