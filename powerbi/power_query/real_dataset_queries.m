// ============================================================================
// CrimeLens — Power Query M Scripts for Real Chicago Dataset (public schema)
// Server: 127.0.0.1:5432 | Database: crimelens_db | Schema: public
// ============================================================================

// --- Query 1: fact_crime ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    fact_crime_Table = public_Schema{[Name="fact_crime"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(fact_crime_Table,{
        {"crime_fact_key", Int64.Type},
        {"source_crime_id", type text},
        {"case_number", type text},
        {"time_key", Int64.Type},
        {"area_key", Int64.Type},
        {"location_key", Int64.Type},
        {"crime_key", Int64.Type},
        {"premise_key", Int64.Type},
        {"status_key", Int64.Type},
        {"crime_count", Int64.Type},
        {"dw_created_at", type datetime}
    })
in
    ChangedTypes

// --- Query 2: dim_time ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    dim_time_Table = public_Schema{[Name="dim_time"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(dim_time_Table,{
        {"time_key", Int64.Type},
        {"full_date", type date},
        {"full_timestamp", type datetime},
        {"year", Int64.Type},
        {"quarter", Int64.Type},
        {"month", Int64.Type},
        {"month_name", type text},
        {"day", Int64.Type},
        {"day_of_week", Int64.Type},
        {"day_name", type text},
        {"hour", Int64.Type},
        {"time_period", type text},
        {"is_weekend", type logical}
    })
in
    ChangedTypes

// --- Query 3: dim_area ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    dim_area_Table = public_Schema{[Name="dim_area"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(dim_area_Table,{
        {"area_key", Int64.Type},
        {"district", type text},
        {"beat", type text},
        {"ward", type text},
        {"community_area", type text}
    })
in
    ChangedTypes

// --- Query 4: dim_location ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    dim_location_Table = public_Schema{[Name="dim_location"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(dim_location_Table,{
        {"location_key", Int64.Type},
        {"block", type text},
        {"latitude", type number},
        {"longitude", type number},
        {"x_coordinate", type number},
        {"y_coordinate", type number}
    })
in
    ChangedTypes

// --- Query 5: dim_crime ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    dim_crime_Table = public_Schema{[Name="dim_crime"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(dim_crime_Table,{
        {"crime_key", Int64.Type},
        {"primary_type", type text},
        {"description", type text},
        {"iucr", type text},
        {"fbi_code", type text}
    })
in
    ChangedTypes

// --- Query 6: dim_premise ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    dim_premise_Table = public_Schema{[Name="dim_premise"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(dim_premise_Table,{
        {"premise_key", Int64.Type},
        {"location_description", type text}
    })
in
    ChangedTypes

// --- Query 7: dim_status ---
let
    Source = PostgreSQL.Database("127.0.0.1:5432", "crimelens_db"),
    public_Schema = Source{[Schema="public"]}[Data],
    dim_status_Table = public_Schema{[Name="dim_status"]}[Data],
    ChangedTypes = Table.TransformColumnTypes(dim_status_Table,{
        {"status_key", Int64.Type},
        {"arrest", type logical},
        {"domestic", type logical}
    })
in
    ChangedTypes
