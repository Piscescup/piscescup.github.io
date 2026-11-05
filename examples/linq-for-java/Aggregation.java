import io.github.piscescup.linq4j.core.IntEnumerable;

public class Aggregation {
    public static void main(String[] args) {
        int total = IntEnumerable.ofInts(1, 2, 3, 4, 5).sum();
        double avg = IntEnumerable.ofInts(1, 2, 3, 4, 5).average();

        System.out.println("total = " + total + ", avg = " + avg);
    }
}
