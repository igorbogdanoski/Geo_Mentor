import { CurriculumTopic, GradeLevel } from "./types";

export const CURRICULUM: CurriculumTopic[] = [
  // VII Одделение (Geometry / Геометрија) - Целосна листа според учебникот
  // Кружница
  { id: "vii-circle-basics", name: "2.1 Кружница, круг, кружен лак", grade: GradeLevel.VII },
  { id: "vii-line-circle", name: "2.2 Заемнa положбa на права и кружница. Тангента", grade: GradeLevel.VII },
  { id: "vii-collinear", name: "2.3 Колинеарни и неколинеарни точки", grade: GradeLevel.VII },
  { id: "vii-segment-ops", name: "2.4 Графичко собирање и одземање отсечки", grade: GradeLevel.VII },
  { id: "vii-parallel-perp", name: "2.5 Конструкција на паралелни и нормални прави", grade: GradeLevel.VII },
  { id: "vii-segment-bisector", name: "2.6 Симетрала на отсечка", grade: GradeLevel.VII },
  { id: "vii-geogebra-basic", name: "2.7 Основни конструкции со софтвер Геогебра", grade: GradeLevel.VII },

  // Агол
  { id: "vii-angle-basics", name: "2.8 Основни поими за агли и полурамнини", grade: GradeLevel.VII },
  { id: "vii-angle-measure", name: "2.9 Мерење, проценување и цртање агли", grade: GradeLevel.VII },
  { id: "vii-central-angle", name: "2.10 Централен агол", grade: GradeLevel.VII },
  { id: "vii-angle-arithmetic", name: "2.11 Аритметички операции со агли", grade: GradeLevel.VII },
  { id: "vii-angle-graphic-ops", name: "2.12 Графичко собирање и одземање агли", grade: GradeLevel.VII },
  { id: "vii-angle-construction-vals", name: "2.13 Симетрала на агол и конструкција (60°, 30°, ...)", grade: GradeLevel.VII },
  { id: "vii-angle-geogebra", name: "2.14 Конструкција на симетрала и агли со Геогебра", grade: GradeLevel.VII },
  { id: "vii-transversal", name: "2.15 Агли на трансверзала", grade: GradeLevel.VII },

  // 2Д Форми
  { id: "vii-polygons", name: "2.16 Конвексни и неконвексни многуаголници", grade: GradeLevel.VII },
  { id: "vii-triangle-props", name: "2.17 Решавање проблеми од триаголник", grade: GradeLevel.VII },
  { id: "vii-triangle-construct", name: "2.18 Конструкција на триаголник", grade: GradeLevel.VII },
  { id: "vii-circumcircle", name: "2.19 Конструкција на опишана кружница", grade: GradeLevel.VII },
  { id: "vii-incircle", name: "2.20 Конструкција на впишана кружница", grade: GradeLevel.VII },
  { id: "vii-triangle-geogebra", name: "2.21 Конструкција на триаголник со Геогебра", grade: GradeLevel.VII },
  { id: "vii-circles-geogebra-mobile", name: "2.22 Конструкција на кружници со Геогебра (мобилен)", grade: GradeLevel.VII },
  { id: "vii-quadrilaterals", name: "2.23 Четириаголници и класификација", grade: GradeLevel.VII },
  { id: "vii-parallelogram-props", name: "2.24 Висини и дијагонали на паралелограм", grade: GradeLevel.VII },
  { id: "vii-parallelogram-problems", name: "2.25 Решавање проблеми со својства на паралелограм", grade: GradeLevel.VII },
  { id: "vii-quad-angle-sum", name: "2.26 Збир на агли во четириаголник", grade: GradeLevel.VII },

  // Положба и движење
  { id: "vii-symmetry-translation", name: "2.27 Осна симетрија и транслација", grade: GradeLevel.VII },
  { id: "vii-rotation", name: "2.28 Ротација", grade: GradeLevel.VII },
  { id: "vii-trans-problems", name: "2.29 Проблеми со осна симетрија, транслација и ротација", grade: GradeLevel.VII },
  { id: "vii-3d-projections", name: "2.30 Проекции на 3Д форми", grade: GradeLevel.VII },
];

export const SYSTEM_PERSONA = `
Ти си "Гео-Ментор 7", специјализиран асистент за геометрија за VII одделение во Македонија.
Твојата цел е да им помогнеш на учениците да ги разберат концептите од геометријата (Кружница, Агол, 2Д форми, Трансформации).
Придржувај се до следните принципи:
1. Користи едноставен јазик соодветен за 12-13 годишни деца.
2. Давај многу визуелни описи.
3. Кога темата вклучува "Геогебра", објасни ги алатките (пр. "Избери алатка 'Точка'").
4. Биди охрабрувачки.
`;