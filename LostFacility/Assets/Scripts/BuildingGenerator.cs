using UnityEngine;

[System.Serializable]
public class BuildingDef
{
    public string name;
    public Vector3 position;
    public Vector3 size;
    public Color color = Color.gray;
    public bool hasRoof = true;
    public float wallThickness = 0.2f;
}

[System.Serializable]
public class ZoneDef
{
    public string name;
    public Vector3 center;
    public float radius = 20f;
    public BuildingDef[] buildings;
    public Color groundColor = new Color(0.3f, 0.3f, 0.3f, 0.5f);
}

public class BuildingGenerator : MonoBehaviour
{
    [Header("Military Base (-80,-100)")]
    public ZoneDef militaryBase;

    [Header("Storage Area (-140,-60)")]
    public ZoneDef storageArea;

    [Header("Radar Station (-40,-150)")]
    public ZoneDef radarStation;

    [Header("Abandoned Settlement (-120,-160)")]
    public ZoneDef abandonedSettlement;

    [Header("Materials")]
    public Material buildingMaterial;
    public Material roofMaterial;
    public Material concreteMaterial;

    void Start()
    {
        GenerateAll();
    }

    public void GenerateAll()
    {
        if (militaryBase.buildings != null && militaryBase.buildings.Length > 0)
            GenerateZone(militaryBase);

        if (storageArea.buildings != null && storageArea.buildings.Length > 0)
            GenerateZone(storageArea);

        if (radarStation.buildings != null && radarStation.buildings.Length > 0)
            GenerateZone(radarStation);

        if (abandonedSettlement.buildings != null && abandonedSettlement.buildings.Length > 0)
            GenerateZone(abandonedSettlement);
    }

    void GenerateZone(ZoneDef zone)
    {
        GameObject zoneGO = new GameObject(zone.name);
        zoneGO.transform.SetParent(transform);
        zoneGO.transform.position = zone.center;

        foreach (BuildingDef b in zone.buildings)
        {
            GenerateBuilding(b, zoneGO.transform);
        }
    }

    void GenerateBuilding(BuildingDef b, Transform parent)
    {
        GameObject go = new GameObject(b.name);
        go.transform.SetParent(parent);
        go.transform.localPosition = b.position;

        // Walls
        Vector3[] wallPositions = {
            new Vector3(0, b.size.y * 0.5f, b.size.z * 0.5f),  // Front
            new Vector3(0, b.size.y * 0.5f, -b.size.z * 0.5f), // Back
            new Vector3(b.size.x * 0.5f, b.size.y * 0.5f, 0),  // Right
            new Vector3(-b.size.x * 0.5f, b.size.y * 0.5f, 0)  // Left
        };
        Vector3[] wallSizes = {
            new Vector3(b.size.x, b.size.y, b.wallThickness),
            new Vector3(b.size.x, b.size.y, b.wallThickness),
            new Vector3(b.wallThickness, b.size.y, b.size.z),
            new Vector3(b.wallThickness, b.size.y, b.size.z)
        };

        for (int i = 0; i < 4; i++)
        {
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "Wall_" + i;
            wall.transform.SetParent(go.transform);
            wall.transform.localPosition = wallPositions[i];
            wall.transform.localScale = wallSizes[i];
            var rend = wall.GetComponent<Renderer>();
            rend.material = GetMaterial(b.color);
            Destroy(wall.GetComponent<BoxCollider>());
        }

        // Floor
        var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "Floor";
        floor.transform.SetParent(go.transform);
        floor.transform.localPosition = new Vector3(0, 0, 0);
        floor.transform.localScale = new Vector3(b.size.x, b.wallThickness, b.size.z);
        floor.GetComponent<Renderer>().material = concreteMaterial;
        Destroy(floor.GetComponent<BoxCollider>());

        // Roof
        if (b.hasRoof)
        {
            var roof = GameObject.CreatePrimitive(PrimitiveType.Cube);
            roof.name = "Roof";
            roof.transform.SetParent(go.transform);
            roof.transform.localPosition = new Vector3(0, b.size.y, 0);
            roof.transform.localScale = new Vector3(b.size.x + 0.5f, 0.1f, b.size.z + 0.5f);
            roof.GetComponent<Renderer>().material = roofMaterial != null ? roofMaterial : GetMaterial(Color.gray);
            Destroy(roof.GetComponent<BoxCollider>());
        }

        // Door opening (front wall gap)
        var door = GameObject.CreatePrimitive(PrimitiveType.Cube);
        door.name = "DoorFrame";
        door.transform.SetParent(go.transform);
        door.transform.localPosition = new Vector3(0, 1.2f, b.size.z * 0.5f + 0.01f);
        door.transform.localScale = new Vector3(0.8f, 2f, 0.1f);
        door.GetComponent<Renderer>().material.color = new Color(0.15f, 0.15f, 0.15f);
        Destroy(door.GetComponent<BoxCollider>());
    }

    Material GetMaterial(Color c)
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.color = c;
        return mat;
    }
}
