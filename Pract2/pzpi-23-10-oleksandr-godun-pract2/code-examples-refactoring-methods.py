from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional


# =========================
# МОДЕЛІ
# =========================
@dataclass
class Course:
    code: str
    title: str
    credits: int
    score: float          # первинний бал 0..100
    absences: int = 0     # кількість пропусків


@dataclass
class StudentRecord:
    student: str
    courses: List[Course] = field(default_factory=list)


# Таблиця переводу бальних оцінок у поінти (4.0 шкала)
def score_to_points(score: float) -> float:
    if score >= 90: return 4.0
    if score >= 80: return 3.0
    if score >= 70: return 2.0
    if score >= 60: return 1.0
    return 0.0


# ============================================================
# 1) ДО РЕФАКТОРИНГУ
#
# Демонструє проблеми:
#  - Split Temporary Variable: змінна g використовується як
#    проміжний бал, потім як поінт, потім як сумарний зважений бал.
#  - Remove Assignments to Parameters: параметри curve і bonus_policy
#    перезаписуються в тілі функції.
#  - Велика функція -> кандидат на Method Object.
# ============================================================
def calc_gpa_before(record: StudentRecord,
                    curve: Optional[float],
                    bonus_policy: Optional[str]) -> Dict:
    # ------ Remove Assignments to Parameters (погано) ------
    if curve is None:
        curve = 0.0   # переприсвоєння параметра
    if bonus_policy is None:
        bonus_policy = "honors+0.1"  # ще одне

    total_credits = 0
    g = 0.0  # <-- Split Temporary Variable: одна змінна для всього

    rows = []
    for c in record.courses:
        # 1) застосувати криву
        g = c.score + curve
        if g > 100:
            g = 100.0

        # 2) штраф за пропуски
        if c.absences >= 3:
            g -= 5
        if g < 0:
            g = 0.0

        # 3) бонусна політика — збережемо плюс (але «до» змішує сенси)
        if str(bonus_policy).startswith("honors"):
            try:
                plus = float(str(bonus_policy).split("+")[1])
            except Exception:
                plus = 0.0
        else:
            plus = 0.0

        # 4) конвертація в поінти
        g = score_to_points(g)  # тепер g — поінти на 4.0 шкалі

        if g == 4.0:
            g += plus  # невеликий бонус лише для A

        # 5) зважування на кредити і «кривий» акумулятор
        weighted = g * c.credits
        g += weighted  # !!! тут g знов використовується вже як акумулятор
        total_credits += c.credits

        # Для чесного підсумку нижче збережемо "чисті" поінти без цього змішування
        # (але рядок додамо для звіту)
        rows.append({
            "course": c.code,
            "credits": c.credits,
            # Для відтворюваності GPA перерахуємо пізніше коректно
            "points": round(score_to_points(min(c.score + (curve or 0.0) - (5 if c.absences >= 3 else 0), 100)), 2),
        })

    # Коректний GPA перерахуємо окремо (з урахуванням honors-бонусу, як у версії "після")
    raw_weighted = 0.0
    for r, c in zip(rows, record.courses):
        pts = r["points"]
        plus = 0.0
        if str(bonus_policy).startswith("honors") and pts >= 4.0:
            try:
                plus = float(str(bonus_policy).split("+")[1])
            except Exception:
                plus = 0.0
        raw_weighted += (pts + plus) * c.credits

    gpa = raw_weighted / total_credits if total_credits else 0.0

    return {
        "student": record.student,
        "gpa": round(gpa, 3),
        "total_credits": total_credits,
        "rows": rows,
        "meta": {"curve": curve, "bonus_policy": bonus_policy}
    }


# ============================================================
# 2) ПІСЛЯ РЕФАКТОРИНГУ — METHOD OBJECT
#
# - Split Temporary Variable: окремі змінні step_score, step_points,
#   weighted_points, accumulator.
# - Remove Assignments to Parameters: параметри НЕ змінюємо; створюємо
#   власні атрибути self.curve/self.bonus_policy.
# - Replace Method with Method Object: дрібні методи для кроків.
# ============================================================
class GPACalculator:
    def __init__(self, record: StudentRecord,
                 curve: Optional[float],
                 bonus_policy: Optional[str]):
        self.record = record
        self.curve = 0.0 if curve is None else curve          # локальна копія (не чіпаємо параметр)
        self.bonus_policy = "honors+0.1" if bonus_policy is None else bonus_policy
        self.total_credits = 0
        self.rows: List[Dict] = []
        self.acc_weighted_points = 0.0

    # крок 1: нормалізуємо бали (крива, штрафи)
    def normalized_score(self, c: Course) -> float:
        step_score = c.score + self.curve
        if step_score > 100:
            step_score = 100.0
        if c.absences >= 3:
            step_score -= 5
        if step_score < 0:
            step_score = 0.0
        return step_score

    # крок 2: переводимо у поінти та застосовуємо бонусну політику
    def points_with_bonus(self, step_score: float) -> float:
        step_points = score_to_points(step_score)
        plus = 0.0
        if str(self.bonus_policy).startswith("honors") and step_points >= 4.0:
            try:
                plus = float(str(self.bonus_policy).split("+")[1])
            except Exception:
                plus = 0.0
        return step_points + plus

    # крок 3: акумулюємо
    def accumulate(self, points: float, credits: int) -> None:
        weighted_points = points * credits
        self.acc_weighted_points += weighted_points
        self.total_credits += credits

    # фасад
    def run(self) -> Dict:
        for c in self.record.courses:
            sc = self.normalized_score(c)
            pts = self.points_with_bonus(sc)
            self.accumulate(pts, c.credits)

            self.rows.append({
                "course": c.code,
                "credits": c.credits,
                "points": round(score_to_points(sc), 2),  # звітні "базові" поінти
            })

        gpa = self.acc_weighted_points / self.total_credits if self.total_credits else 0.0

        return {
            "student": self.record.student,
            "gpa": round(gpa, 3),
            "total_credits": self.total_credits,
            "rows": self.rows,
            "meta": {"curve": self.curve, "bonus_policy": self.bonus_policy}
        }


# =========================
# ДЕМО
# =========================
def demo_data() -> StudentRecord:
    return StudentRecord(
        student="Oleksandr",
        courses=[
            Course("CS101", "Intro to CS", credits=5, score=88, absences=1),
            Course("MA121", "Calculus I", credits=4, score=93, absences=0),
            Course("PH110", "Physics", credits=3, score=76, absences=3),
            Course("EN201", "English", credits=2, score=65, absences=0),
        ]
    )


def main():
    record = demo_data()

    print("=== BEFORE (problematic) ===")
    before = calc_gpa_before(record, curve=None, bonus_policy=None)
    print(before)

    print("\n=== AFTER (Method Object) ===")
    after = GPACalculator(record, curve=None, bonus_policy=None).run()
    print(after)

    # Узгоджене порівняння: беремо ту ж точність, що й у друці (3 знаки)
    assert round(before["gpa"], 3) == round(after["gpa"], 3)

    print("\nOK: GPA matches. "
          "Refactorings: Split Temporary Variable, Remove Assignments to Parameters, "
          "Replace Method with Method Object.")


if __name__ == "__main__":
    main()
