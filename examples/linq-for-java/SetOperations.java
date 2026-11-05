import io.github.piscescup.linq4j.Linq;

public class SetOperations {
    public static void main(String[] args) {
        var seq1 = Linq.of(1, 2, 3, 4);
        var seq2 = Linq.of(3, 4, 5, 6);

        var distinct = seq1.distinct().toList();
        var except = seq1.except(seq2).toList();
        var intersect = seq1.intersect(seq2).toList();
        var union = seq1.union(seq2).toList();

        System.out.println("distinct = " + distinct);
        System.out.println("except = " + except);
        System.out.println("intersect = " + intersect);
        System.out.println("union = " + union);
    }
}
