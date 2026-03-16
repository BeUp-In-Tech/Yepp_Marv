import { redisClient } from '../../config/redis.config';
import { QueryBuilder } from '../../utils/QueryBuilder';
import { DealModel } from '../deal/deal.model';
import { PaymentStatus } from '../payment/payment.interface';
import { PaymentModel } from '../payment/payment.model';
import { ShopApproval } from '../shop/shop.interface';
import { Shop } from '../shop/shop.model';

// 1. CATEGORY BY PROMOTED DEAL COUNT
const dealsByCategoryStats = async () => {
  const cacheKey = 'deals_by_category_stats';
  const getCachedData = await redisClient.get(cacheKey);

  // RETURN CACHED DATA
  if (getCachedData) {
    return JSON.parse(getCachedData);
  }

  const dealsByCategory = await DealModel.aggregate([
    {
      $match: {
        promotedUntil: { $gte: new Date() },
      },
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
  const totalPromotedDeals = dealsByCategory.reduce(
    (acc, curr) => acc + curr.count,
    0
  );

  const data = {
    totalPromotedDeals,
    dealsByCategory,
  };

  // STORE DATA IN REDIS
  await redisClient.set(cacheKey, JSON.stringify(data), {
    EX: 3600, // 1 hour
  });

  // return data
  return data;
};

// 2. VENDORS STATS
const recentVendorsStats = async (query: Record<string, string>) => {
  const fields = query.fields ? query.fields : '';
  const page = query.page ? query.page : 1;
  const limit = query.limit ? query.limit : 10;
  const sort = query.sort ? query.sort : '-createdAt';
  const approval = query.shop_approval || '';

  const cacheKey = `recent_vendors:${fields}_${approval}_${page}_${limit}_${sort}`;
  const getCachedData = await redisClient.get(cacheKey);

  if (getCachedData) {
    return JSON.parse(getCachedData);
  }


  const queryBuilder = new QueryBuilder(Shop.find(), query);

  const vendors = await queryBuilder
    .filter()
    .select()
    .sort()
    .paginate()
    .build();
  const meta = await queryBuilder.getMeta();

  const data = {
    meta,
    vendors,
  };

  // STORE DATA IN REDIS
  await redisClient.set(cacheKey, JSON.stringify(data), {
    EX: 3600, // 1 hour
  });

  // Return data
  return data;
};

// 3. RECENT DEALS STATS
const recentDealsStats = async (query: Record<string, string>) => {
  const fields = query.fields ? query.fields : '';
  const page = query.page ? query.page : 1;
  const limit = query.limit ? query.limit : 10;
  const sort = query.sort ? query.sort : '-createdAt';

  // MAKE CACHE KEY
  const cacheKey = `recent_deals:${fields}_${page}_${limit}_${sort}`;
  const getCachedData = await redisClient.get(cacheKey);

  // RETURN CACHED DATA
  if (getCachedData) {
    return JSON.parse(getCachedData);
  }

  /// DATABASE QUERY
  const queryBuilder = new QueryBuilder(DealModel.find(), query);
  const vendors = await queryBuilder
    .filter()
    .select()
    .join()
    .sort()
    .paginate()
    .build();

  const meta = await queryBuilder.getMeta();

  const data = {
    meta,
    vendors,
  };

  // STORE DATA IN REDIS
  await redisClient.set(cacheKey, JSON.stringify(data), {
    EX: 3600, // 1 hour
  });

  // Return data
  return data;
};

// 4. DEALS STATS
const dealsStats = async (query: Record<string, string>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortStage: any = {};
  sortStage[sortBy] = sortOrder;

  const cacheKey = `deals_stats:${query.searchTerm || ''}_${page}_${limit}_${sortBy}_${sortOrder}`;
  const getCachedData = await redisClient.get(cacheKey);


  // RETURN CACHE DATA
  if (getCachedData) {
    return JSON.parse(getCachedData);
  }


  // DATABASE QUERY
  const result = await DealModel.aggregate([
    
    // STAGE 1: JOIN WITH VIEW IMPRESSION
    {
      $lookup: {
        from: 'views_impressions',
        let: { dealId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$deal', '$$dealId'] },
            },
          },
          {
            $group: {
              _id: null,
              views: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'view'] }, 1, 0],
                },
              },
              impressions: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'impression'] }, 1, 0],
                },
              },
            },
          },
        ],
        as: 'analytics',
      },
    },


    // STAGE 2: JOIN WITH SHOP
    {
      $lookup: {
        from: 'shops',
        localField: 'shop',
        foreignField: '_id',
        as: 'shop',
      },
    },

    // JOIN WITH CATEGORY
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
      },
    },

    { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },

    {
      $addFields: {
        views: { $ifNull: [{ $first: '$analytics.views' }, 0] },
        impressions: { $ifNull: [{ $first: '$analytics.impressions' }, 0] },

        status: {
          $cond: [{ $gt: ['$promotedUntil', new Date()] }, 'Active', 'Expired'],
        },
      },
    },

    {
  $match: {
    $or: [
      { title: { $regex: query.searchTerm || '', $options: 'i' } },
      { tags: { $regex: query.searchTerm || '', $options: 'i' } },
      { 'shop.business_name': { $regex: query.searchTerm || '', $options: 'i' } },
      { 'category.category_name': { $regex: query.searchTerm || '', $options: 'i' } }
    ]
  }
},
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalDeals: { $sum: 1 },
              activeDeals: {
                $sum: {
                  $cond: [{ $gt: ['$promotedUntil', new Date()] }, 1, 0],
                },
              },
              totalViews: { $sum: '$views' },
              totalImpressions: { $sum: '$impressions' },
            },
          },
        ],

        deals: [
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },

          {
            $project: {
              title: 1,
              vendor: '$shop.business_name',
              category_name: '$category.category_name',
              impressions: 1,
              views: 1,
              status: 1,
              expiry: '$promotedUntil',
            },
          },
        ],
      },
    },

  ]);

  const data = result[0];

  const total = await DealModel.countDocuments();

  const meta = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };

  const final_data = {
    meta,
    data,
  };

  

  //   // STORE DATA IN REDIS
  await redisClient.set(cacheKey, JSON.stringify(final_data), {
    EX: 60, // 1 min
  });

  // Return data

  return final_data;
};

// 5. DASHBOARD ANALYTICS TOTAL
const dashboardAnalyticsTotal = async () => {

    const cacheKey = `dashboard_analytics_total`;
    const getCachedData = await redisClient.get(cacheKey);
  
    // RETURN CACHED DATA
    if (getCachedData) {
      return JSON.parse(getCachedData);
    }


  const now = new Date()

  // LAST 30 DAYS
  const last30Days = new Date()
  last30Days.setDate(now.getDate() - 30)

  const [vendors, active_deals, revenue] = await Promise.all([

    // ACTIVE VENDORS
    Shop.countDocuments({
      shop_approval: ShopApproval.APPROVED
    }),

    // ACTIVE DEALS
    DealModel.countDocuments({
      promotedUntil: { $gt: now }
    }),

    // LIFETIME REVENUE
    PaymentModel.aggregate([
      {
        $match: {
          payment_status: PaymentStatus.PAID
        }
      },
      {
        $group: {
          _id: null,
          lifetimeRevenue: { $sum: "$amount" }
        }
      }
    ])

  ])


  // LAST 30 DAYS REVENUE
  const last30DaysRevenue = await PaymentModel.aggregate([
    {
      $match: {
        payment_status: PaymentStatus.PAID,
        createdAt: {
          $gte: last30Days,
          $lte: now
        }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" }
      }
    }
  ])


  const final_data = {
    active_vendors: vendors,
    active_deals,
    total_revenue: revenue[0]?.lifetimeRevenue || 0,
    last30Days_Revenue: last30DaysRevenue[0]?.total || 0
  }


  // STORE DATA IN REDIS
  await redisClient.set(cacheKey, JSON.stringify(final_data), {
    EX: 3600, // 1 hour
    });
  
  // Return data
  return final_data
}

// EXPORT ALL THE SERVICE LAYER
export const dashboardServices = {
  dealsByCategoryStats,
  recentVendorsStats,
  recentDealsStats,
  dealsStats,
  dashboardAnalyticsTotal
};
