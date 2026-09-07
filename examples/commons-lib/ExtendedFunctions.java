import io.github.piscescup.interfaces.exfunction.TriFunction;

public class ExtendedFunctions {
    public static void main(String[] args) {
        TriFunction<Integer, Integer, Integer, Integer> volume =
            (x, y, z) -> x * y * z;

        int v1 = volume.apply(2, 3, 4);
        int v2 = volume.apply(2).apply(3, 4);

        TriFunction<Integer, Integer, Integer, Integer> cached = volume.memorized();
        int v3 = cached.apply(2, 3, 4);

        System.out.println(v1);
        System.out.println(v2);
        System.out.println(v3);
    }
}
