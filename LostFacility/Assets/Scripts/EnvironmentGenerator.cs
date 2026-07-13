using UnityEngine;

public class EnvironmentGenerator : MonoBehaviour
{
    [Header("Military Base Walls")]
    public Vector3 baseCenter = new Vector3(80, 0, 100);
    public Vector2 baseSize = new Vector2(40, 35);
    public float wallHeight = 3.5f;
    public Material concreteMaterial;

    [Header("Watchtowers")]
    public GameObject watchtowerPrefab;
    public Vector3[] towerPositions;

    [Header("Roads")]
    public Material roadMaterial;
    public float roadWidth = 3f;

    [Header("Barriers")]
    public GameObject barrierPrefab;

    void Start()
    {
        GenerateBaseWalls();
        GenerateWatchtowers();
        GenerateRoads();
    }

    void GenerateBaseWalls()
    {
        float hw = baseSize.x * 0.5f;
        float hz = baseSize.y * 0.5f;
        Vector3[][] segments = {
            new Vector3[] { new Vector3(-hw, 0, -hz), new Vector3(hw, 0, -hz) },
            new Vector3[] { new Vector3(hw, 0, -hz), new Vector3(hw, 0, hz) },
            new Vector3[] { new Vector3(hw, 0, hz), new Vector3(-hw, 0, hz) },
            new Vector3[] { new Vector3(-hw, 0, hz), new Vector3(-hw, 0, -hz) }
        };

        foreach (var seg in segments)
        {
            Vector3 mid = (seg[0] + seg[1]) * 0.5f + baseCenter;
            float length = Vector3.Distance(seg[0], seg[1]);

            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = "BaseWall";
            wall.transform.SetParent(transform);
            wall.transform.position = mid + Vector3.up * wallHeight * 0.5f;
            wall.transform.localScale = new Vector3(length, wallHeight, 0.3f);
            wall.GetComponent<Renderer>().material = concreteMaterial ?? new Material(Shader.Find("Standard")) { color = new Color(0.35f, 0.35f, 0.35f) };
            Destroy(wall.GetComponent<BoxCollider>());
        }

        // Gate openings (front and back)
        Vector2[] gatePositions = { new Vector2(0, -hz), new Vector2(0, hz) };
        foreach (var gp in gatePositions)
        {
            Vector3 pos = new Vector3(baseCenter.x + gp.x, 0, baseCenter.z + gp.y);
            var gateFrame = GameObject.CreatePrimitive(PrimitiveType.Cube);
            gateFrame.name = "GateFrame";
            gateFrame.transform.SetParent(transform);
            gateFrame.transform.position = pos + Vector3.up * 2f;
            gateFrame.transform.localScale = new Vector3(2.5f, 4f, 0.5f);
            gateFrame.GetComponent<Renderer>().material.color = new Color(0.2f, 0.2f, 0.2f);
            Destroy(gateFrame.GetComponent<BoxCollider>());
        }
    }

    void GenerateWatchtowers()
    {
        if (towerPositions == null || towerPositions.Length == 0)
        {
            towerPositions = new Vector3[] {
                new Vector3(baseCenter.x - baseSize.x * 0.5f, 0, baseCenter.z - baseSize.y * 0.5f),
                new Vector3(baseCenter.x + baseSize.x * 0.5f, 0, baseCenter.z - baseSize.y * 0.5f),
                new Vector3(baseCenter.x - baseSize.x * 0.5f, 0, baseCenter.z + baseSize.y * 0.5f),
                new Vector3(baseCenter.x + baseSize.x * 0.5f, 0, baseCenter.z + baseSize.y * 0.5f)
            };
        }

        foreach (Vector3 pos in towerPositions)
        {
            GameObject tower = new GameObject("Watchtower");
            tower.transform.SetParent(transform);
            tower.transform.position = pos;

            // Legs
            for (int i = 0; i < 4; i++)
            {
                var leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                leg.name = "Leg";
                leg.transform.SetParent(tower.transform);
                float ox = (i % 2 == 0 ? -0.8f : 0.8f);
                float oz = (i < 2 ? -0.8f : 0.8f);
                leg.transform.localPosition = new Vector3(ox, 2f, oz);
                leg.transform.localScale = new Vector3(0.12f, 2f, 0.12f);
                leg.GetComponent<Renderer>().material.color = new Color(0.3f, 0.3f, 0.3f);
                Destroy(leg.GetComponent<CapsuleCollider>());
                Destroy(leg.GetComponent<BoxCollider>());
            }

            // Platform
            var plat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            plat.name = "Platform";
            plat.transform.SetParent(tower.transform);
            plat.transform.localPosition = new Vector3(0, 4f, 0);
            plat.transform.localScale = new Vector3(2f, 0.15f, 2f);
            plat.GetComponent<Renderer>().material.color = new Color(0.35f, 0.35f, 0.35f);
            Destroy(plat.GetComponent<BoxCollider>());
        }
    }

    void GenerateRoads()
    {
        Vector3[][] roadPaths = {
            new Vector3[] { new Vector3(80,0,100), new Vector3(140,0,60) },   // Base to Storage
            new Vector3[] { new Vector3(80,0,100), new Vector3(40,0,150) },   // Base to Radar
            new Vector3[] { new Vector3(140,0,60), new Vector3(120,0,160) },  // Storage to Settlement
            new Vector3[] { new Vector3(30,0,180), new Vector3(120,0,160) },  // Spawn to Settlement
            new Vector3[] { new Vector3(30,0,180), new Vector3(80,0,100) },   // Spawn to Base
        };

        foreach (var path in roadPaths)
        {
            CreateRoad(path[0], path[1]);
        }
    }

    void CreateRoad(Vector3 from, Vector3 to)
    {
        Vector3 mid = (from + to) * 0.5f;
        Vector3 dir = to - from;
        float length = dir.magnitude;
        dir.Normalize();

        var road = GameObject.CreatePrimitive(PrimitiveType.Cube);
        road.name = "Road";
        road.transform.SetParent(transform);
        road.transform.position = new Vector3(mid.x, 0.05f, mid.z);
        road.transform.localScale = new Vector3(roadWidth, 0.1f, length);
        road.transform.rotation = Quaternion.LookRotation(dir);
        road.GetComponent<Renderer>().material = roadMaterial ?? new Material(Shader.Find("Standard")) { color = new Color(0.2f, 0.2f, 0.2f) };
        Destroy(road.GetComponent<BoxCollider>());
    }
}
