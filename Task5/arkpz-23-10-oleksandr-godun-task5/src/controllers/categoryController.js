import prisma from "../utils/prismaClient.js";

// CREATE — створити категорію
export async function createCategory(req, res) {
  try {
    const { user_id, name, color } = req.body;
    const category = await prisma.categories.create({   
      data: { user_id: +user_id, name, color },
    });
    res.status(201).json(category);
  } catch (err) {
    console.error("Помилка створення категорії:", err);
    res.status(500).json({ error: "Не вдалося створити категорію" });
  }
}

// READ — отримати всі категорії
export async function getCategories(req, res) {
  try {
    const categories = await prisma.categories.findMany({   
      include: { users: true },
    });
    res.json(categories);
  } catch (err) {
    console.error("Помилка отримання категорій:", err);
    res.status(500).json({ error: "Не вдалося отримати категорії" });
  }
}

// UPDATE — оновити категорію
export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const category = await prisma.categories.update({  
      where: { category_id: +id },
      data: { name, color },
    });
    res.json(category);
  } catch (err) {
    console.error("Помилка оновлення категорії:", err);
    res.status(500).json({ error: "Не вдалося оновити категорію" });
  }
}

// DELETE — видалити категорію
export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    await prisma.categories.delete({   
      where: { category_id: +id },
    });
    res.json({ message: "Категорію видалено" });
  } catch (err) {
    console.error("Помилка видалення категорії:", err);
    res.status(500).json({ error: "Не вдалося видалити категорію" });
  }
}
