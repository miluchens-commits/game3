using UnityEngine;
using UnityEngine.Rendering;

[DefaultExecutionOrder(-100)]
public class GameBootstrap : MonoBehaviour
{
    void Awake()
    {
        // Lighting setup
        SetupLighting();

        // Create map generator
        GameObject mapGO = new GameObject("MapGenerator");
        var mapGen = mapGO.AddComponent<MapGenerator>();

        // Terrain
        var terrainGO = new GameObject("TerrainGenerator");
        terrainGO.transform.SetParent(mapGO.transform);
        var terrainGen = terrainGO.AddComponent<TerrainGenerator>();
        terrainGen.flatZones = new Vector2[] {
            new Vector2(80, 100),  // Military Base
            new Vector2(140, 60),  // Storage Area
            new Vector2(40, 150),  // Radar Station
            new Vector2(120, 160), // Abandoned Settlement
            new Vector2(30, 180)   // Forest Spawn
        };
        mapGen.terrainGen = terrainGen;

        // Buildings
        var buildingGO = new GameObject("BuildingGenerator");
        buildingGO.transform.SetParent(mapGO.transform);
        var buildingGen = buildingGO.AddComponent<BuildingGenerator>();
        string shaderName = Shader.Find("Universal Render Pipeline/Lit") != null ? "Universal Render Pipeline/Lit" : "Standard";
        buildingGen.concreteMaterial = new Material(Shader.Find(shaderName)) { color = new Color(0.25f, 0.25f, 0.25f) };
        buildingGen.roofMaterial = new Material(Shader.Find(shaderName)) { color = new Color(0.15f, 0.15f, 0.15f) };
        mapGen.buildingGen = buildingGen;

        // Environment (walls, roads, towers)
        var envGO = new GameObject("EnvironmentGenerator");
        envGO.transform.SetParent(mapGO.transform);
        var envGen = envGO.AddComponent<EnvironmentGenerator>();
        envGen.concreteMaterial = buildingGen.concreteMaterial;
        envGen.roadMaterial = new Material(Shader.Find(shaderName)) { color = new Color(0.12f, 0.12f, 0.12f) };

        // Loot
        var lootGO = new GameObject("LootSpawner");
        lootGO.transform.SetParent(mapGO.transform);
        var lootGen = lootGO.AddComponent<LootSpawner>();
        lootGen.PlaceMilitaryBaseLoot();
        lootGen.PlaceStorageLoot();
        lootGen.PlaceRadarStationLoot();

        Debug.Log("[GameBootstrap] Lost Facility initialized!");
    }

    void SetupLighting()
    {
        // Directional light (sun)
        GameObject sunGO = new GameObject("DirectionalLight");
        var sun = sunGO.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.color = new Color(0.9f, 0.85f, 0.7f);
        sun.intensity = 0.8f;
        sun.shadowStrength = 0.7f;
        sunGO.transform.rotation = Quaternion.Euler(45, 30, 0);

        // Ambient light
        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(0.3f, 0.4f, 0.6f);
        RenderSettings.ambientEquatorColor = new Color(0.2f, 0.25f, 0.3f);
        RenderSettings.ambientGroundColor = new Color(0.1f, 0.1f, 0.12f);

        // Fog
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Exponential;
        RenderSettings.fogColor = new Color(0.25f, 0.3f, 0.35f);
        RenderSettings.fogDensity = 0.008f;
    }
}
