import pandas as pd
import requests
from io import StringIO
import ssl
import urllib3
from urllib3.exceptions import InsecureRequestWarning
import numpy as np

# turn off annoying ssl warnings
urllib3.disable_warnings(InsecureRequestWarning)
ssl._create_default_https_context = ssl._create_unverified_context

YEAR_MIN = 2018
YEAR_MAX = 2023

def clean_numeric_column(series):
    """converts stuff to numbers, makes bad values into NA"""
    return pd.to_numeric(series, errors="coerce")

def filter_years(df):
    """only keep data from 2018-2023"""
    if "Year" in df.columns:
        df = df[(df["Year"] >= YEAR_MIN) & (df["Year"] <= YEAR_MAX)]
    return df

def fetch_bls_laus(api_key="e8ac1722eeff4493836d8bd0b5069a5c"):
    """gets unemployment rates from BLS using Public Data API"""
    print("Fetching BLS LAUS (unemployment rates) via API...")

    # BLS API has a limit of 50 series per request and 500 daily queries
    # We need to get all county unemployment rates (measure code 03)
    # County series IDs look like: LAUCN01001000000003 (state 01, county 001, measure 03)

    # For efficiency, we'll fetch state-level data instead of 3000+ counties
    # Or use USDA ERS which already has all county unemployment data
    print("  NOTE: BLS API limits make fetching 3000+ county series impractical")
    print("  (50 series per request × 6 years = extensive API calls needed)")
    print("  Recommend using USDA ERS data (fetch_usda_ers) which provides")
    print("  all county unemployment rates for 2018-2023 in a single request.")

    return pd.DataFrame()

def fetch_bls_qcew():
    """gets employment and wage data from BLS - WARNING: this is SLOW cuz files are huge"""
    print("Fetching BLS QCEW (employment and wages)...")
    print("  NOTE: Each year is ~500MB, this will take several minutes!")
    all_data = []
    
    for year in range(YEAR_MIN, YEAR_MAX + 1):
        url = f"https://data.bls.gov/cew/data/files/{year}/csv/{year}_annual_singlefile.zip"
        print(f"  Fetching {year}... (this might take 1-2 mins)")
        
        # only read the columns we actaully need to make it faster
        cols_to_read = ['agglvl_code', 'own_code', 'area_fips', 'year', 
                       'annual_avg_emplvl', 'avg_annual_pay']
        
        df = pd.read_csv(url, compression='zip', low_memory=False, usecols=cols_to_read)
        
        # agglvl 70 = county level data
        df = df[df['agglvl_code'] == 70]
        
        # own_code 0 or 5 = all industries combined
        if 'own_code' in df.columns:
            df = df[df['own_code'].isin([0, 5])]
        
        # filter year right away to save memory
        df = df[df['year'] == year]
        
        # make sure fips is 5 digits
        df['fips'] = df['area_fips'].astype(str).str.zfill(5)
        df['Year'] = year
        
        # add up all the employment and average the pay for each county
        agg = df.groupby(['fips', 'Year'], as_index=False).agg({
            'annual_avg_emplvl': 'sum',
            'avg_annual_pay': 'mean'
        })
        
        agg['TotalEmployment'] = clean_numeric_column(agg['annual_avg_emplvl'])
        agg['AvgAnnualPay'] = clean_numeric_column(agg['avg_annual_pay'])
        agg = agg[['fips', 'Year', 'TotalEmployment', 'AvgAnnualPay']]
        all_data.append(agg)
        print(f"  {year} success: {len(agg)} counties")
        
        # clean up memory after each year
        del df, agg
    
    if not all_data:
        print("  All years failed")
        return pd.DataFrame()
    
    result = pd.concat(all_data, ignore_index=True)
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    print(f"  Final: {result.shape}")
    return result

def fetch_bea(api_key="58600DF0-50AB-4DE5-BAB8-BAC7DD1C1591"):
    """gets per capita income from BEA"""
    print("Fetching BEA Regional Personal Income...")
    all_data = []
    
    for year in range(YEAR_MIN, YEAR_MAX + 1):
        bea_url = f"https://apps.bea.gov/api/data/?UserID={api_key}&method=GetData&datasetname=Regional&TableName=CAINC1&LineCode=3&GeoFIPS=COUNTY&Year={year}&ResultFormat=JSON"
        print(f"  Fetching {year}...")
        resp = requests.get(bea_url, verify=False, timeout=30)
        
        if resp.status_code != 200:
            print(f"  {year} failed (HTTP {resp.status_code})")
            continue
        
        data = resp.json()
        if "BEAAPI" not in data or "Results" not in data["BEAAPI"]:
            print(f"  {year} failed (invalid response)")
            continue
        
        results = data["BEAAPI"]["Results"]
        if isinstance(results, list) and len(results) > 0:
            results = results[0]
        
        if "Data" not in results:
            print(f"  {year} failed (no data)")
            continue
        
        # turn the json into a dataframe
        df = pd.DataFrame(results["Data"])
        df = df.rename(columns={"GeoFips":"fips","TimePeriod":"Year","DataValue":"PerCapitaIncome"})
        df["Year"] = year
        df["fips"] = df["fips"].astype(str).str.zfill(5)
        # remove commas from income values
        df["PerCapitaIncome"] = df["PerCapitaIncome"].astype(str).str.replace(",","")
        df["PerCapitaIncome"] = clean_numeric_column(df["PerCapitaIncome"])
        df = df[["fips","Year","PerCapitaIncome"]]
        all_data.append(df)
        print(f"  {year} success: {len(df)} counties")
    
    if not all_data:
        print("  All years failed")
        return pd.DataFrame()
    
    result = pd.concat(all_data, ignore_index=True)
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def fetch_usda_ers():
    """gets unemployment data from USDA ERS (has 2018-2023 data)"""
    print("Fetching USDA ERS county unemployment data...")
    url = "https://ers.usda.gov/sites/default/files/_laserfiche/DataFiles/48747/Unemployment2023.csv"

    try:
        # Use requests to bypass SSL issues with pandas
        resp = requests.get(url, verify=False, timeout=60)
        if resp.status_code != 200:
            print(f"  Failed (HTTP {resp.status_code})")
            return pd.DataFrame()
        df = pd.read_csv(StringIO(resp.text), encoding='latin1', low_memory=False)
    except Exception as e:
        print(f"  Failed to fetch: {e}")
        return pd.DataFrame()

    # New format has FIPS_Code, Attribute (like "Unemployment_rate_2023"), Value
    if 'FIPS_Code' not in df.columns or 'Attribute' not in df.columns or 'Value' not in df.columns:
        print(f"  Failed: unexpected format. Columns: {df.columns.tolist()}")
        return pd.DataFrame()

    df["fips"] = df["FIPS_Code"].astype(str).str.zfill(5)

    # Extract unemployment rates for years 2018-2023
    all_data = []
    for year in range(YEAR_MIN, YEAR_MAX + 1):
        attr_name = f"Unemployment_rate_{year}"
        year_df = df[df["Attribute"] == attr_name].copy()
        if len(year_df) > 0:
            year_df = year_df[["fips", "Value"]].copy()
            year_df["Year"] = year
            year_df["UnemploymentRate"] = clean_numeric_column(year_df["Value"])
            year_df = year_df[["fips", "Year", "UnemploymentRate"]]
            all_data.append(year_df)
            print(f"  Year {year}: {len(year_df)} counties")

    if not all_data:
        print("  No unemployment rate data found")
        return pd.DataFrame()

    result = pd.concat(all_data, ignore_index=True)
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def fetch_saipe():
    """gets poverty and median income from Census Bureau"""
    print("Fetching Census SAIPE (poverty)...")
    all_data = []

    # SAIPE API moved to time series endpoint
    base_url = "https://api.census.gov/data/timeseries/poverty/saipe"

    for year in range(YEAR_MIN, YEAR_MAX + 1):
        # New time series API format
        url = f"{base_url}?get=NAME,SAEPOVRTALL_PT,SAEMHI_PT,GEOID&for=county:*&YEAR={year}"
        print(f"  Fetching {year}...")
        r = requests.get(url, verify=False, timeout=30)

        if r.status_code != 200 or not r.text.strip():
            print(f"  {year} failed (HTTP {r.status_code})")
            continue

        # turn json into dataframe
        data = r.json()
        if len(data) <= 1:
            print(f"  {year} failed (no data)")
            continue

        df = pd.DataFrame(data[1:], columns=data[0])

        # Use GEOID if available (5-digit FIPS), otherwise construct from state+county
        if "GEOID" in df.columns:
            df["fips"] = df["GEOID"].astype(str).str.zfill(5)
        elif "state" in df.columns and "county" in df.columns:
            df["fips"] = df["state"].astype(str).str.zfill(2) + df["county"].astype(str).str.zfill(3)
        else:
            print(f"  {year} failed (missing geography columns)")
            continue

        df["Year"] = year
        # SAEPOVRTALL_PT is poverty rate (all ages)
        df["PovertyRate"] = clean_numeric_column(df.get("SAEPOVRTALL_PT", pd.Series()))
        df["MedianIncome"] = clean_numeric_column(df.get("SAEMHI_PT", pd.Series()))
        df = df[["fips","Year","PovertyRate","MedianIncome"]]
        all_data.append(df)
        print(f"  {year} success: {len(df)} counties")

    if not all_data:
        print("  All years failed")
        return pd.DataFrame()

    result = pd.concat(all_data, ignore_index=True)
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def fetch_zori():
    """gets rent prices from Zillow"""
    print("Fetching Zillow ZORI (rent)...")
    zori_url = "https://files.zillowstatic.com/research/public_csvs/zori/County_zori_uc_sfrcondomfr_sm_month.csv"
    df = pd.read_csv(zori_url, low_memory=False)
    df = df.rename(columns={"RegionName":"county_name", "StateCodeFIPS":"state_fips", "MunicipalCodeFIPS":"county_fips"})

    # make fips code from state and county parts
    df["state_fips"] = df["state_fips"].astype(str).str.zfill(2)
    df["county_fips"] = df["county_fips"].astype(str).str.zfill(3)
    df["fips"] = df["state_fips"] + df["county_fips"]

    # find all the monthly columns (they have dates like 2018-01-31)
    month_cols = [c for c in df.columns if isinstance(c, str) and c.count("-") >= 1]

    if not month_cols:
        print("  Failed (no monthly columns)")
        return pd.DataFrame()

    # turn wide format into long format
    melted = df.melt(id_vars=["fips"], value_vars=month_cols, var_name="Month", value_name="Rent")

    # get year from the date column
    melted["Year"] = melted["Month"].str[:4]
    melted["Year"] = clean_numeric_column(melted["Year"])
    melted = melted.dropna(subset=["Year"])
    melted["Year"] = melted["Year"].astype(int)
    melted = filter_years(melted)
    melted["Rent"] = clean_numeric_column(melted["Rent"])

    # calculate yearly average rent from all the monthly values
    out = melted.groupby(["fips","Year"], as_index=False)["Rent"].mean()
    out = out.replace("", pd.NA).replace(" ", pd.NA)
    out = out[out["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {out.shape}")
    return out

def load_political_data(filepath="data/countypres_2000-2024.csv"):
    """loads county presidential election results and interpolates for non-election years"""
    print("Loading political data...")
    df = pd.read_csv(filepath, low_memory=False)

    # Convert county_fips to string and pad with zeros
    df["fips"] = df["county_fips"].astype(str).str.replace(".0", "", regex=False).str.zfill(5)
    df["Year"] = clean_numeric_column(df["year"])
    df = df.dropna(subset=["Year", "fips"])
    df["Year"] = df["Year"].astype(int)

    # Get election years within our range (2016, 2020, 2024)
    election_years = [y for y in [2016, 2020, 2024] if YEAR_MIN <= y <= YEAR_MAX or y < YEAR_MIN]
    df = df[df["Year"].isin(election_years)]

    # Calculate Republican vote share for each county-year
    party_votes = df.groupby(["fips", "Year", "party"], as_index=False)["candidatevotes"].sum()
    total_votes = df.groupby(["fips", "Year"], as_index=False)["totalvotes"].first()

    # Get Republican and Democrat vote shares
    rep_votes = party_votes[party_votes["party"] == "REPUBLICAN"][["fips", "Year", "candidatevotes"]]
    rep_votes = rep_votes.rename(columns={"candidatevotes": "RepublicanVotes"})

    dem_votes = party_votes[party_votes["party"] == "DEMOCRAT"][["fips", "Year", "candidatevotes"]]
    dem_votes = dem_votes.rename(columns={"candidatevotes": "DemocratVotes"})

    # Merge
    result = pd.merge(total_votes, rep_votes, on=["fips", "Year"], how="left")
    result = pd.merge(result, dem_votes, on=["fips", "Year"], how="left")

    # Calculate vote shares
    result["RepublicanVoteShare"] = (result["RepublicanVotes"] / result["totalvotes"]) * 100
    result["DemocratVoteShare"] = (result["DemocratVotes"] / result["totalvotes"]) * 100
    result["RepublicanMargin"] = result["RepublicanVoteShare"] - result["DemocratVoteShare"]

    election_data = result[["fips", "Year", "RepublicanVoteShare", "DemocratVoteShare", "RepublicanMargin"]].copy()

    # Interpolate for non-election years
    # For each county, fill forward election results to next years
    all_years_data = []
    for fips_code in election_data["fips"].unique():
        county_data = election_data[election_data["fips"] == fips_code].sort_values("Year")

        # Create rows for all years
        for year in range(YEAR_MIN, YEAR_MAX + 1):
            # Find most recent election year <= current year
            recent_elections = county_data[county_data["Year"] <= year]
            if not recent_elections.empty:
                recent = recent_elections.iloc[-1]
                all_years_data.append({
                    "fips": fips_code,
                    "Year": year,
                    "RepublicanVoteShare": recent["RepublicanVoteShare"],
                    "DemocratVoteShare": recent["DemocratVoteShare"],
                    "RepublicanMargin": recent["RepublicanMargin"]
                })

    interpolated = pd.DataFrame(all_years_data)
    interpolated = interpolated.replace("", pd.NA).replace(" ", pd.NA)
    interpolated = interpolated[interpolated["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {interpolated.shape} (interpolated from {len(election_data)} election results)")
    return interpolated

def load_drug_deaths(filepath="data/drug_deaths_2018_2023.csv"):
    """loads CDC WONDER drug overdose death data"""
    print("Loading drug overdose deaths...")
    df = pd.read_csv(filepath, low_memory=False)

    # Clean up column names
    df.columns = df.columns.str.strip()
    # Remove .0 from County Code before padding
    df["fips"] = df["County Code"].astype(str).str.replace(".0", "", regex=False).str.strip().str.zfill(5)
    df["Year"] = clean_numeric_column(df["Year Code"])
    df = df.dropna(subset=["Year", "fips"])
    df["Year"] = df["Year"].astype(int)
    df = filter_years(df)

    # Handle Deaths column - may contain "Suppressed" or numeric values
    df["Deaths"] = df["Deaths"].replace(["Suppressed", "Not Applicable"], pd.NA)
    df["DrugDeaths"] = clean_numeric_column(df["Deaths"])

    # Handle Crude Rate - may contain "Unreliable" or "Suppressed"
    df["Crude Rate"] = df["Crude Rate"].replace(["Unreliable", "Suppressed", "Not Applicable"], pd.NA)
    df["DrugDeathRate"] = clean_numeric_column(df["Crude Rate"])

    result = df[["fips", "Year", "DrugDeaths", "DrugDeathRate"]]
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def load_suicide_deaths(filepath="data/suicide_mortality_2018-2023.csv"):
    """loads CDC WONDER suicide mortality data"""
    print("Loading suicide deaths...")
    df = pd.read_csv(filepath, low_memory=False)

    # Clean up column names
    df.columns = df.columns.str.strip()
    # Remove .0 from County Code before padding
    df["fips"] = df["County Code"].astype(str).str.replace(".0", "", regex=False).str.strip().str.zfill(5)
    df["Year"] = clean_numeric_column(df["Year Code"])
    df = df.dropna(subset=["Year", "fips"])
    df["Year"] = df["Year"].astype(int)
    df = filter_years(df)

    # Handle Deaths column - may contain "Suppressed" or numeric values
    df["Deaths"] = df["Deaths"].replace(["Suppressed", "Not Applicable"], pd.NA)
    df["SuicideDeaths"] = clean_numeric_column(df["Deaths"])

    # Handle Crude Rate - may contain "Unreliable" or "Suppressed"
    df["Crude Rate"] = df["Crude Rate"].replace(["Unreliable", "Suppressed", "Not Applicable"], pd.NA)
    df["SuicideRate"] = clean_numeric_column(df["Crude Rate"])

    result = df[["fips", "Year", "SuicideDeaths", "SuicideRate"]]
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def load_mental_health(filepath="data/mentalhealth_county.csv"):
    """loads mental health data (static - no year)"""
    print("Loading mental health data...")
    df = pd.read_csv(filepath, low_memory=False)

    df["fips"] = df["FIPS"].astype(str).str.zfill(5)
    df["MentalHealthScore"] = clean_numeric_column(df["Value"])

    result = df[["fips", "MentalHealthScore"]]
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def fetch_acs_demographics():
    """fetches ACS 5-year demographics from Census API"""
    print("Fetching Census ACS demographics...")
    all_data = []

    # ACS 5-year estimates are released with a 1-year lag
    # 2018 data from ACS 2018 5-year (2014-2018), published 2019
    # Using ACS 1-year for more recent data or 5-year for stability
    year_to_acs = {
        2018: 2018,  # ACS 2018 5-year
        2019: 2019,  # ACS 2019 5-year
        2020: 2020,  # ACS 2020 5-year
        2021: 2021,  # ACS 2021 5-year
        2022: 2022,  # ACS 2022 5-year
        2023: 2022,  # Use 2022 for 2023 (most recent available)
    }

    for year in range(YEAR_MIN, YEAR_MAX + 1):
        acs_year = year_to_acs.get(year, 2022)
        # ACS 5-year variables:
        # B01003_001E: Total population
        # B15003_022E: Bachelor's degree
        # B15003_023E: Master's degree
        # B15003_024E: Professional degree
        # B15003_025E: Doctorate
        # B01001_001E: Total population for percentages
        # B02001_002E: White alone
        # B02001_003E: Black or African American alone
        # B03003_003E: Hispanic or Latino

        variables = [
            "B01003_001E",  # Total population
            "B15003_001E",  # Total 25+ (education denominator)
            "B15003_022E", "B15003_023E", "B15003_024E", "B15003_025E",  # Bachelor's+
            "B02001_001E",  # Total (race denominator)
            "B02001_002E",  # White alone
            "B02001_003E",  # Black alone
            "B03003_001E",  # Total (ethnicity denominator)
            "B03003_003E",  # Hispanic or Latino
        ]

        url = f"https://api.census.gov/data/{acs_year}/acs/acs5?get=NAME,{','.join(variables)}&for=county:*"
        print(f"  Fetching {year} (using ACS {acs_year})...")

        try:
            r = requests.get(url, verify=False, timeout=60)
            if r.status_code != 200:
                print(f"  {year} failed (HTTP {r.status_code})")
                continue

            data = r.json()
            if len(data) <= 1:
                print(f"  {year} failed (no data)")
                continue

            df = pd.DataFrame(data[1:], columns=data[0])

            # Construct FIPS
            if "state" in df.columns and "county" in df.columns:
                df["fips"] = df["state"].astype(str).str.zfill(2) + df["county"].astype(str).str.zfill(3)
            else:
                print(f"  {year} failed (missing geography)")
                continue

            df["Year"] = year

            # Calculate percentages
            total_pop = clean_numeric_column(df["B01003_001E"])
            edu_total = clean_numeric_column(df["B15003_001E"])
            bachelors = clean_numeric_column(df["B15003_022E"])
            masters = clean_numeric_column(df["B15003_023E"])
            professional = clean_numeric_column(df["B15003_024E"])
            doctorate = clean_numeric_column(df["B15003_025E"])

            race_total = clean_numeric_column(df["B02001_001E"])
            white = clean_numeric_column(df["B02001_002E"])
            black = clean_numeric_column(df["B02001_003E"])

            ethnicity_total = clean_numeric_column(df["B03003_001E"])
            hispanic = clean_numeric_column(df["B03003_003E"])

            df["BachelorsOrHigher"] = ((bachelors + masters + professional + doctorate) / edu_total) * 100
            df["WhiteAlone"] = (white / race_total) * 100
            df["BlackAlone"] = (black / race_total) * 100
            df["HispanicLatino"] = (hispanic / ethnicity_total) * 100
            df["Population"] = total_pop

            result_df = df[["fips", "Year", "BachelorsOrHigher", "WhiteAlone", "BlackAlone", "HispanicLatino", "Population"]]
            all_data.append(result_df)
            print(f"  {year} success: {len(result_df)} counties")

        except Exception as e:
            print(f"  {year} failed: {e}")
            continue

    if not all_data:
        print("  All years failed")
        return pd.DataFrame()

    result = pd.concat(all_data, ignore_index=True)
    result = result.replace("", pd.NA).replace(" ", pd.NA)
    result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
    print(f"  Final: {result.shape}")
    return result

def fetch_fbi_crime():
    """fetches FBI UCR crime data - NOTE: FBI UCR data requires special handling"""
    print("Fetching FBI crime data...")
    print("  NOTE: FBI UCR county-level data is not available via simple API")
    print("  FBI transitioned to NIBRS in 2021, and county data requires")
    print("  downloading large files from https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/downloads")
    print("  Skipping for now - recommend manual download if needed")
    return pd.DataFrame()

def fetch_healthcare_access():
    """fetches healthcare access metrics from HRSA and CMS"""
    print("Fetching healthcare access data...")
    all_data = []

    # Try to get Health Professional Shortage Area (HPSA) scores from HRSA
    # This indicates mental health professional shortages
    # HRSA Data Warehouse API
    print("  NOTE: HRSA data requires API key or manual download")
    print("  See: https://data.hrsa.gov/")

    # Alternative: Use County Health Rankings data which includes healthcare access
    chr_url = "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2023.csv"

    try:
        print(f"  Fetching County Health Rankings...")
        df = pd.read_csv(chr_url, low_memory=False, encoding='latin1')

        # CHR uses 5-digit FIPS in 'fipscode' column
        if 'fipscode' in df.columns:
            df['fips'] = df['fipscode'].astype(str).str.zfill(5)
        elif 'statecode' in df.columns and 'countycode' in df.columns:
            df['fips'] = df['statecode'].astype(str).str.zfill(2) + df['countycode'].astype(str).str.zfill(3)
        else:
            print("  Failed: could not find FIPS columns")
            return pd.DataFrame()

        # CHR data is typically annual - use most recent year for all
        # Extract relevant healthcare access metrics
        # Column names vary by year, common ones:
        # v004_rawvalue: Primary care physicians per 100,000
        # v062_rawvalue: Mental health providers per 100,000
        # v003_rawvalue: Uninsured %

        result = df[['fips']].copy()

        # Try to find primary care and mental health provider columns
        pcp_cols = [c for c in df.columns if 'primary' in c.lower() or 'v004' in c.lower()]
        mhp_cols = [c for c in df.columns if 'mental' in c.lower() and 'provider' in c.lower() or 'v062' in c.lower()]
        uninsured_cols = [c for c in df.columns if 'uninsured' in c.lower() or 'v003' in c.lower()]

        if pcp_cols:
            result['PrimaryCarePhysiciansRate'] = clean_numeric_column(df[pcp_cols[0]])
        if mhp_cols:
            result['MentalHealthProvidersRate'] = clean_numeric_column(df[mhp_cols[0]])
        if uninsured_cols:
            result['UninsuredPercent'] = clean_numeric_column(df[uninsured_cols[0]])

        result = result.replace("", pd.NA).replace(" ", pd.NA)
        result = result[result["fips"].str.match(r'^\d{5}$', na=False)]
        print(f"  Final: {result.shape}")
        return result

    except Exception as e:
        print(f"  Failed: {e}")
        return pd.DataFrame()

def merge_all(skip_qcew=False):
    """combines all the diffrent data sources together"""
    dfs = []

    # Fetch remote data sources
    # Note: QCEW is VERY slow (~500MB per year × 6 years), can skip if not needed
    remote_sources = [
        fetch_bls_laus,
        fetch_bea,
        fetch_usda_ers,
        fetch_saipe,
        fetch_zori,
        fetch_acs_demographics,  # Full ACS demographics from Census API
        fetch_fbi_crime,  # Crime data (may be empty)
        fetch_healthcare_access,  # Healthcare access metrics
    ]
    if not skip_qcew:
        remote_sources.insert(1, fetch_bls_qcew)  # Insert QCEW after LAUS

    # Load local data sources
    local_sources = [
        load_political_data,  # Now interpolated for all years
        load_drug_deaths,
        load_suicide_deaths,
        load_mental_health,
    ]

    all_sources = remote_sources + local_sources

    for f in all_sources:
        print(f"\n--- {f.__name__} ---")
        df = f()
        if df is not None and not df.empty:
            dfs.append(df)
            print(f"✓ Success: {len(df)} rows, {df.columns.tolist()}")
        else:
            print(f"✗ Failed")
    
    if not dfs:
        print("\n❌ No data sources succeeded")
        return pd.DataFrame()
    
    # seperate datasets with years from static ones
    yearly_dfs = [df for df in dfs if "Year" in df.columns]
    static_dfs = [df for df in dfs if "Year" not in df.columns]
    
    print(f"\nYearly datasets: {len(yearly_dfs)}, Static datasets: {len(static_dfs)}")
    
    # merge all the yearly datasets together
    if yearly_dfs:
        merged = yearly_dfs[0]
        print(f"Starting with: {merged.shape}")
        
        for df in yearly_dfs[1:]:
            # outer join keeps all counties even if some data is missing
            merged = pd.merge(merged, df, on=["fips","Year"], how="outer")
            print(f"After merge: {merged.shape}")
    else:
        merged = None
    
    # add the static datasets (ones without years)
    for df in static_dfs:
        if merged is not None:
            merged = pd.merge(merged, df, on=["fips"], how="left")
            print(f"After static merge: {merged.shape}")
        else:
            merged = df
    
    if merged is not None:
        # make sure we only have our years
        if "Year" in merged.columns:
            merged = filter_years(merged)
            # sort by fips then year so its organized
            merged = merged.sort_values(["fips", "Year"]).reset_index(drop=True)
        else:
            merged = merged.sort_values("fips").reset_index(drop=True)

        # double check all fips codes are valid
        merged = merged[merged["fips"].str.match(r'^\d{5}$', na=False)]

        # Missing data analysis
        print("\n" + "="*60)
        print("MISSING DATA ANALYSIS")
        print("="*60)
        missing_counts = merged.isnull().sum()
        missing_pct = (merged.isnull().sum() / len(merged)) * 100

        missing_summary = pd.DataFrame({
            'Missing_Count': missing_counts,
            'Missing_Percent': missing_pct
        }).sort_values('Missing_Percent', ascending=False)

        print(missing_summary[missing_summary['Missing_Count'] > 0])

        # Identify columns with high missingness
        high_missing = missing_summary[missing_summary['Missing_Percent'] > 50]
        if not high_missing.empty:
            print(f"\n⚠️  Columns with >50% missing data:")
            for col in high_missing.index:
                print(f"  - {col}: {high_missing.loc[col, 'Missing_Percent']:.1f}% missing")

        # save to csv file
        merged.to_csv("county_year_merged.csv", index=False)
        print(f"\n✓ Saved: county_year_merged.csv ({len(merged)} rows)")
        print(f"Columns ({len(merged.columns)}): {merged.columns.tolist()}")

    return merged

if __name__ == "__main__":
    final_df = merge_all()
    if not final_df.empty:
        print("\n" + "="*60)
        print("SAMPLE DATA:")
        print("="*60)
        print(final_df.head(10))
        print(f"\nShape: {final_df.shape}")
        print(f"Columns: {final_df.columns.tolist()}")
        if "Year" in final_df.columns:
            print(f"Years covered: {sorted(final_df['Year'].unique())}")
        print(f"\nMissing data counts:")
        print(final_df.isnull().sum())
        print(f"\nBasic stats:")
        print(final_df.describe())
    else:
        print("\n❌ No data was merged")