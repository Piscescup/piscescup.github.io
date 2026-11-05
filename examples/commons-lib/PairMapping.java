import io.github.piscescup.interfaces.Pair;

public class PairMapping {
    public static void main(String[] args) {
        Pair<String, Integer> pair = Pair.of("apple", 3);
        Pair<String, Integer> mapped = pair.mappedLeft(String::toUpperCase);

        String left = mapped.getLeft();
        Integer right = mapped.getRight();

        System.out.println(left);
        System.out.println(right);
    }
}
