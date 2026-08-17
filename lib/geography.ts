import { and, eq } from "drizzle-orm";
import { database } from "@/lib/db";
import { deliverySites, districts, provinces } from "@/db/schema";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidPattern.test(value.trim());
}

export async function resolveProvinceId(reference: string) {
  const value = reference.trim();
  const [row] = await database()
    .select({ id: provinces.id })
    .from(provinces)
    .where(isUuid(value) ? eq(provinces.id, value) : eq(provinces.code, value))
    .limit(1);
  return row?.id ?? null;
}

export async function resolveDistrictId(reference: string) {
  const value = reference.trim();
  const [row] = await database()
    .select({ id: districts.id })
    .from(districts)
    .where(isUuid(value) ? eq(districts.id, value) : eq(districts.code, value))
    .limit(1);
  return row?.id ?? null;
}

export async function resolveDeliverySiteId(reference: string) {
  const value = reference.trim();
  const [row] = await database()
    .select({ id: deliverySites.id })
    .from(deliverySites)
    .where(isUuid(value) ? eq(deliverySites.id, value) : eq(deliverySites.code, value))
    .limit(1);
  return row?.id ?? null;
}

export async function districtBelongsToProvince(districtId: string, provinceId: string) {
  const [row] = await database()
    .select({ id: districts.id })
    .from(districts)
    .where(and(eq(districts.id, districtId), eq(districts.provinceId, provinceId)))
    .limit(1);
  return Boolean(row);
}

export async function deliverySiteBelongsToDistrict(deliverySiteId: string, districtId: string) {
  const [row] = await database()
    .select({ id: deliverySites.id })
    .from(deliverySites)
    .where(and(eq(deliverySites.id, deliverySiteId), eq(deliverySites.districtId, districtId)))
    .limit(1);
  return Boolean(row);
}
