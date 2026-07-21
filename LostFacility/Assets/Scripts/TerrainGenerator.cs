using UnityEngine;

public class TerrainGenerator : MonoBehaviour
{
    [Header("Terrain Size")]
    public int terrainWidth = 300;
    public int terrainLength = 300;
    public int heightmapResolution = 513;
    public float maxHeight = 30f;

    [Header("Hill Parameters")]
    public int hillCount = 18;
    public float hillMinRadius = 10f;
    public float hillMaxRadius = 35f;
    public float hillMinHeight = 3f;
    public float hillMaxHeight = 15f;

    [Header("Base Areas (flat)")]
    public Vector2[] flatZones;

    private Terrain terrain;
    private TerrainData terrainData;

    public void Generate()
    {
        CreateTerrain();
        GenerateHeightmap();
        ApplyTextures();
        SetupCollision();
    }

    void CreateTerrain()
    {
        terrainData = new TerrainData
        {
            heightmapResolution = heightmapResolution,
            size = new Vector3(terrainWidth, maxHeight, terrainLength)
        };

        GameObject go = Terrain.CreateTerrainGameObject(terrainData);
        go.name = "MainTerrain";
        go.transform.SetParent(transform);
        terrain = go.GetComponent<Terrain>();
    }

    void GenerateHeightmap()
    {
        float[,] heights = new float[heightmapResolution, heightmapResolution];
        float hmW = heightmapResolution - 1;

        // Flat zones (military base, storage, etc.)
        Vector2[] flats = flatZones;
        if (flats == null || flats.Length == 0)
        {
            flats = new Vector2[] {
                new Vector2(80, 100), // Military Base center
                new Vector2(140, 60), // Storage Area
                new Vector2(40, 150), // Radar Station hill
                new Vector2(120, 160) // Abandoned Settlement
            };
        }

        for (int z = 0; z < heightmapResolution; z++)
        {
            for (int x = 0; x < heightmapResolution; x++)
            {
                float worldX = (float)x / hmW * terrainWidth;
                float worldZ = (float)z / hmW * terrainLength;
                float h = 0f;

                // Hills
                for (int i = 0; i < hillCount; i++)
                {
                    Vector2 center = GetHillCenter(i);
                    float radius = GetHillRadius(i);
                    float height = GetHillHeight(i);
                    float dist = Vector2.Distance(new Vector2(worldX, worldZ), center);
                    if (dist < radius)
                    {
                        float t = 1f - (dist / radius);
                        h += Mathf.Sin(t * Mathf.PI * 0.5f) * height;
                    }
                }

                // Flatten base areas
                foreach (Vector2 flat in flats)
                {
                    float flatRadius = 25f;
                    float dist = Vector2.Distance(new Vector2(worldX, worldZ), flat);
                    if (dist < flatRadius)
                    {
                        float t = dist / flatRadius;
                        float flattenFactor = Mathf.SmoothStep(1, 0, t);
                        h *= flattenFactor;
                    }
                }

                // Edge fade to prevent cliffs at borders
                float edgeFade = Mathf.Min(
                    Mathf.Min(x, hmW - x) / 10f,
                    Mathf.Min(z, hmW - z) / 10f
                );
                h *= Mathf.Clamp01(edgeFade);

                heights[z, x] = Mathf.Clamp01(h / maxHeight);
            }
        }

        terrainData.SetHeights(0, 0, heights);
    }

    void ApplyTextures()
    {
        if (terrain.materialTemplate == null)
        {
            var mat = new Material(Shader.Find("Nature/Terrain/Standard"));
            terrain.materialTemplate = mat;
        }
    }

    void SetupCollision()
    {
        terrain.GetComponent<TerrainCollider>().terrainData = terrainData;
    }

    // Deterministic hill data using position-based seeds
    Vector2 GetHillCenter(int i)
    {
        float angle = i * 137.5f * Mathf.Deg2Rad;
        float radius = 40f + (i * 27f % 110f);
        float cx = terrainWidth * 0.5f + Mathf.Cos(angle) * radius;
        float cz = terrainLength * 0.5f + Mathf.Sin(angle) * radius;
        return new Vector2(Mathf.Clamp(cx, 10, terrainWidth - 10), Mathf.Clamp(cz, 10, terrainLength - 10));
    }

    float GetHillRadius(int i) { return Mathf.Lerp(hillMinRadius, hillMaxRadius, (i % 7) / 7f); }
    float GetHillHeight(int i) { return Mathf.Lerp(hillMinHeight, hillMaxHeight, (i % 5) / 5f); }
}
