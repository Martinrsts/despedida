import { Category } from "./types";

export const getCategoryEmoji = (category: Category): string => {
  switch (category) {
    case "safe":
      return "🟢";
    case "fun":
      return "😄";
    case "spicy":
      return "🌶️";
    default:
      return "❓";
  }
};
