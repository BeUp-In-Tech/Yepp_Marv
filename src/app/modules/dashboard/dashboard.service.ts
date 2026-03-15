 import { DealModel } from "../deal/deal.model";


const dealsByCategoryStats = async () => {
    const dealsByCategory = await DealModel.aggregate([
        {
            $match: {
                promotedUntil: { $gte: new Date() },
            }
        },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'categories', // MongoDB collection name
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category_info',
                },
            },
            {
                $unwind: '$category_info',
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$category_info._id',
                    category_name: '$category_info.category_name',
                    count: 1,
                },
            },
            {
                $sort: { count: -1 }, // optional: sort by count
            },
        ]);

        // Calculate total deals
        const totalPromotedDeals = dealsByCategory.reduce((acc, curr) => acc + curr.count, 0);

        return {totalPromotedDeals, dealsByCategory };

}





// EXPORT ALL THE SERVICE LAYER
export const dashboardServices = {
    dealsByCategoryStats

}