import { Question } from "./types.js";

const base = (
  id: string,
  text: string,
  category: Question["category"],
): Question => ({ id, text, category, source: "predefined" });

export const predefinedQuestions: Question[] = [
  base("q1", "¿Cuále es mi día favorito de la semana?", "safe"),
  base("q2", "¿Cuál aplicación es la que primero abro en las mañanas?", "safe"),
  base("q3", "¿Cuál es mi juego de mesa favorito?", "safe"),
  base("q4", "¿Qué hago normalmente cuando me pongo nervioso?", "safe"),
  base("q5", "¿Qué actividad procrastino?", "safe"),

  base("q6", "¿En qué año y dónde nos conocimos con mi novia?", "safe"),
  base("q7", "¿Cuále es mi comida favorita?", "safe"),
  base("q8", "¿Cuál fue mi primer trabajo?", "safe"),
  base("q9", "¿Cuál es mi serie favorita?", "safe"),
  base("q10", "¿Cuále es mi sitcom favorito?", "safe"),
  base("q11", "¿Cuál es mi pelicula favorita?", "safe"),
  base("q12", "¿Cómo se llama mi mejor amigo del colegio?", "safe"),
  base("q13", "¿Qué actividad me relaja más?", "safe"),
  base("q14", "¿Cuál es mi trago favorito?", "safe"),
  base("q15", "¿Cuál es mi postre favorito?", "safe"),
  base("q16", "¿Qué deporte me gusta más ver?", "safe"),
  base("q17", "¿Que deporte me gusta más hacer?", "safe"),
  base("q18", "¿Cuál es mi destino de viaje soñado?", "safe"),
  base(
    "q19",
    "¿Qué cosa siempre digo que voy a hacer pero nunca hago?",
    "safe",
  ),
  base("q20", "¿Cuál es mi peor hábito?", "safe"),
  base("q21", "¿Qué me pone de mal humor rápidamente?", "safe"),
  base("q22", "¿Qué haría si ganara la lotería mañana?", "safe"),
  base("q23", "¿Cuál es mi mayor miedo?", "safe"),
  base("q24", "¿Quién dio el primer beso en la relación?", "safe"),
  base("q25", "¿De qué siempre hablo cuando estoy borracho?", "safe"),
  base(
    "q26",
    'Si mañana mismo renunciara a mi trabajo, ¿a qué me dedicaría "por amor al arte"?',
    "safe",
  ),
  base(
    "q27",
    "¿Cuál es ese objeto que guardo por nostalgia aunque no sirva para nada?",
    "safe",
  ),
  base(
    "q28",
    "¿Qué es lo primero que hago apenas me despierto un domingo?",
    "safe",
  ),
  base(
    "q29",
    "¿Cuál es el regalo más feo o inútil que he recibido en mi vida?",
    "safe",
  ),
  base(
    "q30",
    "Si tuviera que comer una sola cosa el resto de mi vida, ¿qué sería?",
    "safe",
  ),
  base("q31", "¿Cuál es mi mayor maña o TOC?", "safe"),
  base(
    "q32",
    "¿Cuál fue mi materia o ramo más odiado en la etapa de estudio?",
    "safe",
  ),

  base("q33", "¿Qué talento inútil tengo?", "fun"),
  base(
    "q34",
    "Si fuera un superhéroe, ¿cuál sería mi superpoder completamente inútil?",
    "fun",
  ),
  base("q35", "Si yo fuera un emoji, ¿cuál sería y por qué?", "fun"),
  base(
    "q36",
    "Crea el título para un película basada en mi vida sexual antes de conocer a mi novia.",
    "fun",
  ),
  base(
    "q37",
    "Si fuera un villano, ¿cuál sería mi plan ridículamente malo para conquistar el mundo?",
    "fun",
  ),
  base(
    "q38",
    "¿Qué excusa absurda daría si llego tarde a mi propia boda?",
    "fun",
  ),
  base("q39", "¿Qué apodo me pondrían en la cárcel?", "fun"),
  base("q40", "Si fuera un animal, ¿cuál sería y por qué?", "fun"),
  base("q41", "¿Qué haría si me vuelvo invisible por 24 horas?", "fun"),
  base("q42", "¿Qué objeto representaría mejor mi personalidad?", "fun"),
  base("q43", "¿Cómo sería mi perfil de Tinder en una línea?", "fun"),
  base(
    "q44",
    "¿Qué es lo más estúpido en lo que he gastado una suma considerable de dinero?",
    "fun",
  ),
  base(
    "q45",
    "¿Qué es lo que más probablemente me causaría la muerte en un apocalipsis zombie?",
    "fun",
  ),
  base(
    "q46",
    "Si me detuvieran por un crimen absurdo, ¿qué pensarían todos que hice?",
    "fun",
  ),
  base(
    "q47",
    "¿Cómo se llamaría mi autobiografía escrita por mi peor enemigo?",
    "fun",
  ),
  base(
    "q48",
    "¿Cuál sería mi táctica de seducción más patética si hoy volviera a estar soltero?",
    "fun",
  ),
  base("q49", "¿Qué pretendo odiar pero en realidad me gusta?", "fun"),
  base(
    "q50",
    "¿Cuál es el talento que creo tener pero en realidad no tengo?",
    "fun",
  ),
  base("q51", "¿Qué apodo es el que más me daría vergüenza?", "fun"),

  base(
    "q52",
    "¿Con cuantes personas salí antes de estar con mi novia?",
    "spicy",
  ),
  base("q53", "¿A cuantas personas me he agarrado?", "spicy"),
  base("q54", "¿Qué parte del cuerpo de mi novia me gusta más?", "spicy"),
  base("q55", "¿Cuál es el lugar más loco en el que he agarrado?", "spicy"),
  base("q56", "¿Qué apodo me pone mi novia en la intimidad?", "spicy"),
  base(
    "q57",
    "¿Qué es lo más vergonzoso que me ha pasado en una cita?",
    "spicy",
  ),
  base("q58", "¿Cuál es mi mayor “turn off”?", "spicy"),
  base("q59", "¿Cuál es mi mayor “turn on”?", "spicy"),
  base("q60", "¿Qué famosa/o sería mi “permitido/a”?", "spicy"),
  base(
    "q61",
    "¿Qué prenda de ropa de mi novia me parece la más sexy?",
    "spicy",
  ),
  base(
    "q62",
    '¿Cuál es mi opinión sobre los tríos? (¿A favor, en contra o "depende"?)',
    "spicy",
  ),
  base(
    "q63",
    '¿Quién de los presentes creen que sería mi "permitido" si yo fuera soltero?',
    "spicy",
  ),
  base(
    "q64",
    "¿Qué es lo más cursi o ridículo que he hecho por amor (o por sexo)?",
    "spicy",
  ),
  base(
    "q65",
    "¿Qué fetiche creen que tengo, aunque nunca lo haya admitido?",
    "spicy",
  ),
];
