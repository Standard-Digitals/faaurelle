import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./BotanicalIngredientsSection.module.css";

export type BotanicalIngredient = {
  name: string;
  description: string;
  image: string;
};

type BotanicalIngredientsSectionProps = {
  eyebrow: string;
  heading: ReactNode;
  description?: string;
  ingredients: readonly BotanicalIngredient[];
};

export function BotanicalIngredientsSection({
  eyebrow,
  heading,
  description,
  ingredients,
}: BotanicalIngredientsSectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{heading}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </header>

      <div className={styles.grid}>
        {ingredients.map((ingredient) => (
          <article key={ingredient.name}>
            <div className={styles.image}>
              <Image
                src={ingredient.image}
                alt=""
                fill
                sizes="(max-width: 720px) 92vw, 31vw"
              />
            </div>
            <div className={styles.copy}>
              <h3>{ingredient.name}</h3>
              <p>{ingredient.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
