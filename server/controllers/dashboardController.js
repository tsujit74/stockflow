import Product from "../models/Product.js";

export const getDashboardSummary = async (_req, res) => {
  try {
    const [summary] = await Product.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalInventoryQuantity: { $sum: "$quantity" },
                lowStockProducts: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gt: ["$quantity", 0] },
                          { $lte: ["$quantity", "$lowStockThreshold"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                outOfStockProducts: {
                  $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] },
                },
                totalInventoryValue: {
                  $sum: { $multiply: ["$price", "$quantity"] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalProducts: 1,
                totalInventoryQuantity: 1,
                lowStockProducts: 1,
                outOfStockProducts: 1,
                totalInventoryValue: 1,
              },
            },
          ],
          categories: [
            {
              $group: {
                _id: "$category",
                totalProducts: { $sum: 1 },
                totalInventoryQuantity: { $sum: "$quantity" },
                totalInventoryValue: {
                  $sum: { $multiply: ["$price", "$quantity"] },
                },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                totalProducts: 1,
                totalInventoryQuantity: 1,
                totalInventoryValue: 1,
              },
            },
            { $sort: { category: 1 } },
          ],
        },
      },
    ]);

    const totals = summary?.totals[0] ?? {
      totalProducts: 0,
      totalInventoryQuantity: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalInventoryValue: 0,
    };

    return res.json({
      success: true,
      summary: {
        ...totals,
        categories: summary?.categories ?? [],
      },
    });
  } catch (error) {
    console.error("Failed to retrieve dashboard summary:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve dashboard summary.",
    });
  }
};
