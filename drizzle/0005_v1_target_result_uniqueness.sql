ALTER TABLE "targets" ADD CONSTRAINT "targets_indicator_year_province_district_unique" UNIQUE("indicator_id","year","province_id","district_id");
ALTER TABLE "results" ADD CONSTRAINT "results_target_period_unique" UNIQUE("target_id","period_start","period_end");
