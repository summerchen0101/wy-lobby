export type VipDataRow = {
  ID: number;
  Name: number;
  VIPLV: number;
  VIPPoint: number;
  LvRewardGC: number;
  LvRewardSC: number;
  WordDataIDs: number | string;
};

/** Static VIPData table (aligned with VIPData.xlsx). */
export const VIP_DATA: readonly VipDataRow[] = [
  {
    ID: 1,
    Name: 1000,
    VIPLV: 0,
    VIPPoint: 0,
    LvRewardGC: 0,
    LvRewardSC: 0,
    WordDataIDs: "2001",
  },
  {
    ID: 2,
    Name: 1001,
    VIPLV: 1,
    VIPPoint: 300,
    LvRewardGC: 50000,
    LvRewardSC: 10000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 3,
    Name: 1002,
    VIPLV: 2,
    VIPPoint: 600,
    LvRewardGC: 50000,
    LvRewardSC: 2000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 4,
    Name: 1003,
    VIPLV: 3,
    VIPPoint: 900,
    LvRewardGC: 50000,
    LvRewardSC: 2000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 5,
    Name: 1004,
    VIPLV: 4,
    VIPPoint: 1200,
    LvRewardGC: 50000,
    LvRewardSC: 2000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 6,
    Name: 1005,
    VIPLV: 5,
    VIPPoint: 1800,
    LvRewardGC: 50000,
    LvRewardSC: 50000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 7,
    Name: 1006,
    VIPLV: 6,
    VIPPoint: 2400,
    LvRewardGC: 50000,
    LvRewardSC: 5000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 8,
    Name: 1007,
    VIPLV: 7,
    VIPPoint: 3000,
    LvRewardGC: 50000,
    LvRewardSC: 5000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 9,
    Name: 1008,
    VIPLV: 8,
    VIPPoint: 3600,
    LvRewardGC: 50000,
    LvRewardSC: 5000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 10,
    Name: 1009,
    VIPLV: 9,
    VIPPoint: 4200,
    LvRewardGC: 50000,
    LvRewardSC: 5000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 11,
    Name: 1010,
    VIPLV: 10,
    VIPPoint: 4800,
    LvRewardGC: 200000,
    LvRewardSC: 100000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 12,
    Name: 1011,
    VIPLV: 11,
    VIPPoint: 6000,
    LvRewardGC: 1000000,
    LvRewardSC: 200000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 13,
    Name: 1012,
    VIPLV: 12,
    VIPPoint: 50000,
    LvRewardGC: 2000000,
    LvRewardSC: 1000000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 14,
    Name: 1013,
    VIPLV: 13,
    VIPPoint: 500000,
    LvRewardGC: 10000000,
    LvRewardSC: 5000000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 15,
    Name: 1014,
    VIPLV: 14,
    VIPPoint: 5000000,
    LvRewardGC: 50000000,
    LvRewardSC: 15000000,
    WordDataIDs: "2003,2002,2004",
  },
  {
    ID: 16,
    Name: 1015,
    VIPLV: 15,
    VIPPoint: 50000000,
    LvRewardGC: 100000000,
    LvRewardSC: 50000000,
    WordDataIDs: "2003,2002,2004",
  },
];

export const VIP_DATA_BY_VIPLV = new Map<number, VipDataRow>(
  VIP_DATA.map((row) => [row.VIPLV, row]),
);
