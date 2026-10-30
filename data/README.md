# Dataset asset and provenance

`Complete-data.csv` is the supplied tabular training asset used by the local landslide model. The filename alone does not establish its creator, geographic coverage, measurement units, collection date or redistribution rights.

## Asset identity

| Attribute | Value |
| --- | --- |
| File | `data/Complete-data.csv` |
| Format | CSV with a header; 1,212 observations and 13 columns |
| Target | `Landslide`, binary labels 0 and 1 |
| Feature columns | 12 encoded numeric predictors |
| SHA-256 | `157a95a05ec00cc736793f60b6a01057d2e5076ba29181380e2e30c0e22f1728` |
| Source platform reported by team | [Kaggle](https://www.kaggle.com/); exact dataset listing not yet supplied |
| Supplied through | Existing project workspace; original publisher not established |
| Original creator/source URL or DOI | **Team confirmation required** |
| Data license and public redistribution permission | **Team confirmation required before public submission** |
| Collection dates and geographic coverage | **Not supplied; Rwanda representativeness is unverified** |
| Class encoding dictionary and original units | **Not supplied** |

Keep this source file unchanged when reproducing the reported model. Replacing it changes the model fingerprint and may change feature validation and evaluation results. To verify the checksum, use `Get-FileHash data/Complete-data.csv -Algorithm SHA256` in PowerShell or `sha256sum data/Complete-data.csv` on Linux.

## Field guide

All predictors are stored as numeric codes/classes. The labels below explain intended feature categories; they do not establish original units, thresholds or geological category mappings.

| Column | Intended feature category | Model use |
| --- | --- | --- |
| Landslide | Landslide occurrence/susceptibility label | Target, never an inference input |
| Aspect | Slope orientation | Predictor |
| Curvature | Terrain curvature | Predictor |
| Earthquake | Seismic factor | Predictor |
| Elevation | Terrain height class | Predictor |
| Flow | Hydrological flow factor | Predictor |
| Lithology | Geological material class | Predictor |
| NDVI | Vegetation-index class | Predictor |
| NDWI | Water-index class | Predictor |
| Plan | Plan-curvature factor | Predictor |
| Precipitation | Precipitation class | Predictor |
| Profile | Profile-curvature factor | Predictor |
| Slope | Terrain steepness class | Predictor |

Do not enter raw rainfall millimeters, elevation meters or continuous NDVI/NDWI values as dataset codes. Obtain the original codebook and validate an encoding adapter first. The authenticated model metadata endpoint lists accepted observed codes.

## Processing and limitations

The backend checks numeric/finite values, excludes all feature vectors with conflicting target labels, deduplicates remaining identical vectors and creates a fixed stratified 80/20 split. A 300-tree Random Forest trains on the training partition; ROC AUC and Brier score are measured on the holdout. The evaluated model serves requests without fitting to the holdout. The model endpoint reports row counts, exclusions and a dataset/configuration/version fingerprint.

The CSV contains no coordinates, district/cell identifiers, timestamps or population/exposure fields. Map locations are supplied separately by an operator or reporter. No vulnerability index, geographic validation or time-ahead forecast can be inferred from this file alone. Displayed probabilities are model estimates, not verified emergency forecasts.

## Citation completion template

Before submission, replace the unresolved fields above with evidence and use the publisher's required citation, for example: Creator(s). Year. *Verified dataset title*, version. Publisher/repository. DOI or stable URL. License. Access date.

The team identified Kaggle as the source platform. Its homepage is not a dataset citation or a redistribution license: supply the exact kaggle.com/datasets/... listing, author, version and attached license. Do not cite NISR, MINEMA or another institution as the dataset author without confirmation. National policy references in the root README describe the application context, not the provenance of this CSV. If public redistribution is not permitted, obtain approval or provide authorized access instructions; do not invent a download link.
