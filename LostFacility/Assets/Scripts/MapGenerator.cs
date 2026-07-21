using UnityEngine;

public class MapGenerator : MonoBehaviour
{
    [Header("Terrain")]
    public TerrainGenerator terrainGen;

    [Header("Buildings")]
    public BuildingGenerator buildingGen;

    [Header("Environment")]
    public EnvironmentGenerator envGen;

    [Header("Loot")]
    public LootSpawner lootGen;

    [Header("Player")]
    public GameObject playerPrefab;

    void Start()
    {
        GenerateMap();
    }

    public void GenerateMap()
    {
        if (terrainGen != null)
            terrainGen.Generate();

        SetupZones();

        if (buildingGen != null)
            buildingGen.GenerateAll();

        if (envGen != null)
            envGen.GenerateAll();

        if (lootGen != null)
            lootGen.SpawnAllLoot();

        SpawnPlayer();
        Debug.Log("[MapGenerator] Lost Facility 300m map generated!");
    }

    void SetupZones()
    {
        if (buildingGen == null) return;

        buildingGen.militaryBase = new ZoneDef
        {
            name = "MilitaryBase",
            center = new Vector3(120, 0, 150),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "CommandCenter", position = new Vector3(0,0,0), size = new Vector3(14,5,10), color = new Color(0.4f,0.4f,0.45f) },
                new BuildingDef { name = "Barracks1", position = new Vector3(-14,0,8), size = new Vector3(10,3.5f,6), color = new Color(0.35f,0.35f,0.35f) },
                new BuildingDef { name = "Barracks2", position = new Vector3(14,0,8), size = new Vector3(10,3.5f,6), color = new Color(0.35f,0.35f,0.35f) },
                new BuildingDef { name = "Armory", position = new Vector3(0,0,-10), size = new Vector3(8,3.5f,5), color = new Color(0.3f,0.3f,0.3f) },
                new BuildingDef { name = "Garage", position = new Vector3(18,0,-6), size = new Vector3(9,3.5f,7), color = new Color(0.4f,0.38f,0.35f) },
                new BuildingDef { name = "GuardPost", position = new Vector3(-18,0,-4), size = new Vector3(4,2.5f,4), color = new Color(0.38f,0.38f,0.4f) },
                new BuildingDef { name = "MessHall", position = new Vector3(0,0,14), size = new Vector3(10,3,7), color = new Color(0.42f,0.4f,0.38f) },
            }
        };

        buildingGen.storageArea = new ZoneDef
        {
            name = "StorageArea",
            center = new Vector3(210, 0, 90),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "MainWarehouse", position = new Vector3(0,0,0), size = new Vector3(18,6,12), color = new Color(0.5f,0.45f,0.4f) },
                new BuildingDef { name = "Warehouse2", position = new Vector3(-14,0,8), size = new Vector3(12,4,8), color = new Color(0.45f,0.42f,0.38f) },
                new BuildingDef { name = "Maintenance", position = new Vector3(14,0,-6), size = new Vector3(8,3,6), color = new Color(0.4f,0.4f,0.35f) },
                new BuildingDef { name = "SmallStorage", position = new Vector3(-10,0,-8), size = new Vector3(6,2.5f,5), color = new Color(0.45f,0.45f,0.4f) },
                new BuildingDef { name = "FuelDepot", position = new Vector3(0,0,-12), size = new Vector3(5,3,5), color = new Color(0.55f,0.5f,0.3f) },
            }
        };

        buildingGen.radarStation = new ZoneDef
        {
            name = "RadarStation",
            center = new Vector3(60, 0, 230),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "RadarTower", position = new Vector3(0,0,0), size = new Vector3(3,10,3), color = new Color(0.5f,0.5f,0.55f), hasRoof = false },
                new BuildingDef { name = "CommsCenter", position = new Vector3(8,0,6), size = new Vector3(7,3.5f,6), color = new Color(0.4f,0.42f,0.45f) },
                new BuildingDef { name = "ControlRoom", position = new Vector3(-8,0,5), size = new Vector3(6,3,5), color = new Color(0.38f,0.38f,0.4f) },
                new BuildingDef { name = "GeneratorShed", position = new Vector3(0,0,-8), size = new Vector3(5,2.5f,5), color = new Color(0.35f,0.35f,0.35f) },
                new BuildingDef { name = "SatelliteDish", position = new Vector3(12,0,-4), size = new Vector3(2,4,2), color = new Color(0.6f,0.6f,0.65f), hasRoof = false },
            }
        };

        buildingGen.abandonedSettlement = new ZoneDef
        {
            name = "AbandonedSettlement",
            center = new Vector3(180, 0, 200),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "House1", position = new Vector3(-6,0,-2), size = new Vector3(5,3,5), color = new Color(0.5f,0.45f,0.4f) },
                new BuildingDef { name = "House2", position = new Vector3(6,0,-4), size = new Vector3(5,3,5), color = new Color(0.45f,0.4f,0.35f) },
                new BuildingDef { name = "House3", position = new Vector3(-5,0,7), size = new Vector3(4.5f,3,4.5f), color = new Color(0.48f,0.43f,0.38f) },
                new BuildingDef { name = "House4", position = new Vector3(5,0,6), size = new Vector3(4.5f,3,4.5f), color = new Color(0.42f,0.4f,0.37f) },
                new BuildingDef { name = "Shop", position = new Vector3(8,0,0), size = new Vector3(6,3,5), color = new Color(0.4f,0.38f,0.35f) },
                new BuildingDef { name = "GasStation", position = new Vector3(0,0,-9), size = new Vector3(6,3,5), color = new Color(0.35f,0.35f,0.3f) },
                new BuildingDef { name = "Church", position = new Vector3(0,0,10), size = new Vector3(5,5,6), color = new Color(0.5f,0.48f,0.45f) },
            }
        };

        buildingGen.helipad = new ZoneDef
        {
            name = "Helipad",
            center = new Vector3(260, 0, 170),
            buildings = new BuildingDef[]
            {
                new BuildingDef { name = "Helipad_", position = new Vector3(0,0,0), size = new Vector3(12,0.3f,12), color = new Color(0.3f,0.3f,0.3f) },
                new BuildingDef { name = "Hangar", position = new Vector3(10,0,4), size = new Vector3(10,4,8), color = new Color(0.4f,0.4f,0.42f) },
                new BuildingDef { name = "ControlTower", position = new Vector3(-8,0,6), size = new Vector3(4,6,4), color = new Color(0.45f,0.45f,0.48f) },
                new BuildingDef { name = "FuelStation", position = new Vector3(6,0,-6), size = new Vector3(5,2.5f,4), color = new Color(0.35f,0.35f,0.3f) },
            }
        };
    }

    void SpawnPlayer()
    {
        if (playerPrefab == null)
        {
            var capsule = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            capsule.name = "Player";
            capsule.transform.position = new Vector3(45, 1, 270);
            capsule.transform.localScale = new Vector3(0.5f, 1, 0.5f);
            capsule.AddComponent<CharacterController>();
            capsule.AddComponent<FPSController>();
            return;
        }
        Instantiate(playerPrefab, new Vector3(45, 1, 270), Quaternion.identity);
    }
}
