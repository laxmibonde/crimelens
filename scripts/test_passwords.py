import psycopg2

candidates = [
    "postgres", "Postgres", "Postgres123", "Postgres123!", "Postgres@123", "postgres123",
    "suvar", "suvar123", "suvarna", "Suvarna", "Suvarna123", "Suvarna@123", "suvarna123",
    "bonde", "Bonde", "Bonde123", "laxmi", "Laxmi", "Laxmi123", "Laxmi@123", "laxmi123",
    "CrimeLens", "crimelens", "crimelens123", "CrimeLens123!", "CrimeLens@123",
    "admin", "Admin", "Admin123", "Admin@123", "admin123",
    "root", "Root", "Root123", "Root@123", "root123",
    "password", "Password", "Password123", "Password@123",
    "123456", "12345678", "123456789", "1234", "12345", "0000", "1111",
    "pass", "sql", "dw", "dwm", "dwm123", "dwmproject"
]

host = "127.0.0.1"
port = 5432
user = "postgres"

found = None
for pwd in candidates:
    try:
        conn = psycopg2.connect(
            host=host, port=port, user=user, password=pwd, dbname="postgres", connect_timeout=1
        )
        print(f"\n==================================================")
        print(f"SUCCESS! Found PostgreSQL password: '{pwd}'")
        print(f"==================================================\n")
        conn.close()
        found = pwd
        break
    except Exception:
        pass

if not found:
    print("Could not find matching password in candidate list.")
