using UnityEngine;

public class MapGenerator : MonoBehaviour
{
    [Header("Terrain")]
    public TerrainGenerator terrainGen;

    [Header("Buildings")]
    public BuildingGenerator buildingGen;

    [Header("Player")]
    public GameObject playerPrefab;

    void Start()
    {
        GenerateMap();
    }

    public void GenerateMap()
    {
        // 1. Generate terrain
        if (terrainGen != null)
            terrainGen.Generate();

        // 2. Setup building zones
        SetupZones();

        // 3. Generate buildings
        if (buildingGen != null)
            buildingGen.GenerateAll();

        // 4. Place player at a spawn point
        SpawnPlayer();

        Debug.Log("[MapGenerator] Lost Facility map generated successfully!");
    }

    void SetupZones()
    {
        if (buildingGen == null) return;

        // === MILITARY BASE (center at 80, 100) ===
        buildingGen.militaryBase = new ZoneDef
        {
            name = "MilitaryBase",
            center = new Vector3(80, 0, 100),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "CommandCenter", position = new Vector3(0,0,0), size = new Vector3(12,4,8), color = new Color(0.4f,0.4f,0.45f) },
                new BuildingDef { name = "Barracks1", position = new Vector3(-10,0,6), size = new Vector3(8,3,5), color = new Color(0.35f,0.35f,0.35f) },
                new BuildingDef { name = "Barracks2", position = new Vector3(10,0,6), size = new Vector3(8,3,5), color = new Color(0.35f,0.35f,0.35f) },
                new BuildingDef { name = "Armory", position = new Vector3(0,0,-8), size = new Vector3(6,3,4), color = new Color(0.3f,0.3f,0.3f) },
                new BuildingDef { name = "Garage", position = new Vector3(-14,0,-4), size = new Vector3(7,3,6), color = new Color(0.4f,0.38f,0.35f) },
            }
        };

        // === STORAGE AREA (center at 140, 60) ===
        buildingGen.storageArea = new ZoneDef
        {
            name = "StorageArea",
            center = new Vector3(140, 0, 60),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "Warehouse", position = new Vector3(0,0,0), size = new Vector3(15,5,10), color = new Color(0.5f,0.45f,0.4f) },
                new BuildingDef { name = "Maintenance", position = new Vector3(-10,0,-6), size = new Vector3(8,3,6), color = new Color(0.4f,0.4f,0.35f) },
                new BuildingDef { name = "SmallStorage", position = new Vector3(10,0,5), size = new Vector3(5,2.5f,4), color = new Color(0.45f,0.45f,0.4f) },
            }
        };

        // === RADAR STATION (center at 40, 150) ===
        buildingGen.radarStation = new ZoneDef
        {
            name = "RadarStation",
            center = new Vector3(40, 0, 150),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "RadarTower", position = new Vector3(0,0,0), size = new Vector3(3,8,3), color = new Color(0.5f,0.5f,0.55f), hasRoof = false },
                new BuildingDef { name = "CommsCenter", position = new Vector3(6,0,4), size = new Vector3(6,3,5), color = new Color(0.4f,0.42f,0.45f) },
                new BuildingDef { name = "ControlRoom", position = new Vector3(-6,0,3), size = new Vector3(5,2.5f,4), color = new Color(0.38f,0.38f,0.4f) },
                new BuildingDef { name = "GeneratorShed", position = new Vector3(0,0,-6), size = new Vector3(4,2,4), color = new Color(0.35f,0.35f,0.35f) },
            }
        };

        // === ABANDONED SETTLEMENT (center at 120, 160) ===
        buildingGen.abandonedSettlement = new ZoneDef
        {
            name = "AbandonedSettlement",
            center = new Vector3(120, 0, 160),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "House1", position = new Vector3(-5,0,0), size = new Vector3(4,2.5f,4), color = new Color(0.5f,0.45f,0.4f) },
                new BuildingDef { name = "House2", position = new Vector3(5,0,-2), size = new Vector3(4,2.5f,4), color = new Color(0.45f,0.4f,0.35f) },
                new BuildingDef { name = "House3", position = new Vector3(-4,0,6), size = new Vector3(3.5f,2.5f,3.5f), color = new Color(0.48f,0.43f,0.38f) },
                new BuildingDef { name = "Shop", position = new Vector3(6,0,5), size = new Vector3(5,2.5f,4), color = new Color(0.4f,0.38f,0.35f) },
                new BuildingDef { name = "GasStation", position = new Vector3(0,0,-6), size = new Vector3(5,2.5f,4), color = new Color(0.35f,0.35f,0.3f) },
            }
        };
    }

    void SpawnPlayer()
    {
        if (playerPrefab == null)
        {
            // Create a simple capsule as default player
            var capsule = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            capsule.name = "Player";
            capsule.transform.position = new Vector3(30, 1, 180); // Forest spawn
            capsule.transform.localScale = new Vector3(0.5f, 1, 0.5f);
            capsule.AddComponent<CharacterController>();
            capsule.AddComponent<FPSController>();
            return;
        }
        Instantiate(playerPrefab, new Vector3(30, 1, 180), Quaternion.identity);
    }
}
