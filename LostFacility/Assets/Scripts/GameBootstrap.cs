using UnityEngine;
using UnityEngine.Rendering;

[DefaultExecutionOrder(-100)]
public class GameBootstrap : MonoBehaviour
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    private static void Init()
    {
        if (GameObject.Find("GameBootstrap") != null) return;
        var go = new GameObject("GameBootstrap", typeof(GameBootstrap));
        DontDestroyOnLoad(go);
    }

    void Awake()
    {
        CleanupDefaults();
        SetupLighting();
        CreateMap();
    }

    void CleanupDefaults()
    {
        var mainCam = GameObject.Find("Main Camera");
        if (mainCam != null)
        {
            var listener = mainCam.GetComponent<AudioListener>();
            if (listener != null) Destroy(listener);
            Destroy(mainCam);
        }
        var dirLight = GameObject.Find("Directional Light");
        if (dirLight != null) Destroy(dirLight);
    }

    void SetupLighting()
    {
        GameObject sunGO = new GameObject("DirectionalLight");
        var sun = sunGO.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.color = new Color(0.9f, 0.85f, 0.7f);
        sun.intensity = 0.8f;
        sun.shadowStrength = 0.7f;
        sunGO.transform.rotation = Quaternion.Euler(45, 30, 0);

        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(0.3f, 0.4f, 0.6f);
        RenderSettings.ambientEquatorColor = new Color(0.2f, 0.25f, 0.3f);
        RenderSettings.ambientGroundColor = new Color(0.1f, 0.1f, 0.12f);

        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Exponential;
        RenderSettings.fogColor = new Color(0.25f, 0.3f, 0.35f);
        RenderSettings.fogDensity = 0.008f;
    }

    void CreateMap()
    {
        GameObject mapGO = new GameObject("MapGenerator");
        var mapGen = mapGO.AddComponent<MapGenerator>();

        var terrainGO = new GameObject("TerrainGenerator");
        terrainGO.transform.SetParent(mapGO.transform);
        var terrainGen = terrainGO.AddComponent<TerrainGenerator>();
        terrainGen.flatZones = new Vector2[] {
            new Vector2(120, 150),
            new Vector2(210, 90),
            new Vector2(60, 230),
            new Vector2(180, 200),
            new Vector2(260, 170),
            new Vector2(45, 270)
        };
        mapGen.terrainGen = terrainGen;

        var buildingGO = new GameObject("BuildingGenerator");
        buildingGO.transform.SetParent(mapGO.transform);
        var buildingGen = buildingGO.AddComponent<BuildingGenerator>();
        string shaderName = Shader.Find("Universal Render Pipeline/Lit") != null ? "Universal Render Pipeline/Lit" : "Standard";
        buildingGen.concreteMaterial = new Material(Shader.Find(shaderName)) { color = new Color(0.25f, 0.25f, 0.25f) };
        buildingGen.roofMaterial = new Material(Shader.Find(shaderName)) { color = new Color(0.15f, 0.15f, 0.15f) };
        mapGen.buildingGen = buildingGen;

        var envGO = new GameObject("EnvironmentGenerator");
        envGO.transform.SetParent(mapGO.transform);
        var envGen = envGO.AddComponent<EnvironmentGenerator>();
        envGen.concreteMaterial = buildingGen.concreteMaterial;
        envGen.roadMaterial = new Material(Shader.Find(shaderName)) { color = new Color(0.35f, 0.35f, 0.35f) };

        var lootGO = new GameObject("LootSpawner");
        lootGO.transform.SetParent(mapGO.transform);
        var lootGen = lootGO.AddComponent<LootSpawner>();
        lootGen.PlaceMilitaryBaseLoot();
        lootGen.PlaceStorageLoot();
        lootGen.PlaceRadarStationLoot();
        lootGen.PlaceSettlementLoot();
        lootGen.PlaceHelipadLoot();
        lootGen.PlaceForestLoot();

        Debug.Log("[GameBootstrap] Lost Facility initialized!");
    }
}
